/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiPanel, EuiSkeletonTitle, useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
// We use this instead of FlyoutTemplate.Body.Accordion because the latter omits `hasBorder`
// and defaults it on, whereas we render subpanels ourselves.
import { FlyoutAccordion } from '@kbn/flyout-sections';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { EDIT_EPISODE_ASSIGNEE_ACTION_ID } from '../../actions/edit_assignee';
import { useInvalidateEpisodeQueries } from '../../hooks/use_invalidate_episode_queries';
import { useEpisodeDetailsHeaderData } from '../../hooks/use_episode_details_header_data';
import { isRuleLoaded } from '../../types/rule_state';
import { isEpisodeSnoozed } from '../../utils/is_episode_snoozed';
import { isSupportedEpisodeSeverity, normalizeEpisodeSeverity } from '../severity/severity_utils';
import { AlertEpisodeSeverityHealth } from '../severity/episode_severity_health';
import { EPISODE_STATUS_BADGE_COLORS, getEpisodeStatusBadgeLabel } from '../status/status_badge';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { CopyableShortId } from '../copyable_short_id';
import { AlertEpisodeGroupingSection } from './grouping_section';
import { AlertEpisodeTrendChartSection } from './trend_chart_section';
import { AlertEpisodeTimelineHeatmapsSection } from './timeline_heatmaps_section';
import { AlertEpisodeRuleOverviewPanelSection } from './rule_overview_panel_section';
import { AlertEpisodesRelatedSection } from './related_section';
import { AlertEpisodeRunbookSection } from './runbook_section';
import { AlertEpisodeTimelineSection } from './timeline_section';
import { AlertEpisodeMetadataSection } from './metadata_section';
import { EpisodeFooterActionMenu } from './footer_action_menu';
import { EMPTY_VALUE } from '../../constants';
import { formatDateTime } from '../../utils/format_date_time';
import { formatMetadataListDuration } from './translations';
import type { EpisodeAction } from '../../actions/types';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

type TabId = 'overview' | 'timeline' | 'metadata';

/**
 * Mirrors `FLYOUT_MIN_CELL_WIDTH` and `FLYOUT_MAX_GRID_COLUMNS` in
 * `@kbn/flyout-info-blocks`, to estimate an initial width that allows 4 info blocks
 * to be displayed in one line
 */
const INFO_BLOCKS_MIN_CELL_WIDTH = 140;
const INFO_BLOCKS_COLUMNS = 4;

/** Matches the `paddingSize` passed to the flyout, which EUI resolves to a theme size. */
const FLYOUT_PADDING_SIZE = 'm';

/**
 * Groups the episode flyout and anything opened from it into one navigation history.
 */
const FLYOUT_HISTORY_KEY = Symbol('alertingV2EpisodeDetails');

const FLYOUT_TEST_SUBJ = 'alertingV2EpisodeFlyout';
const FLYOUT_FOOTER_TEST_SUBJ = 'alertingV2EpisodeFlyoutFooter';
const METADATA_PANEL_TEST_SUBJ = 'alertingV2EpisodeFlyoutMetadataPanel';
const METADATA_CALLOUT_TEST_SUBJ = 'alertingV2EpisodeMetadataTabStaleCallout';

/** The doc viewer only flexes its grid once it has some height. Any small number does. */
const DOC_VIEWER_FLEX_ACTIVATION_OFFSET = 80;

/** Marks our wrapper, so the styles below can match on it instead of a test subject. */
const METADATA_SCOPE_CLASS = 'alertingV2EpisodeMetadataScope';

/**
 * Stops the flyout body scrolling so only the table does, and lets the table fill it.
 * Global because these elements come from FlyoutTemplate, which has no prop for a
 * full-height tab panel.
 * Matching the wrapper through that class twice is on purpose: it makes the selector one
 * level deeper than EUI's padding rule, which is what lets the reset win.
 */
const metadataBodyStyles = css`
  [data-test-subj='euiFlyoutBodyOverflow']:has(.${METADATA_SCOPE_CLASS}) {
    overflow: hidden;

    /* The content wrapper. Padding off so the table reaches the edges, and a real
       height so it can fill. The controls get their padding back below. */
    > *:has(.${METADATA_SCOPE_CLASS}) {
      padding: 0;
      block-size: 100%;
      display: flex;
      flex-direction: column;
    }

    /* The tab panel, sitting between that wrapper and our own element. */
    *:has(> .${METADATA_SCOPE_CLASS}) {
      block-size: 100%;
    }
  }
`;

/** Fills the body, and pads the doc viewer's controls but not its table. */
const metadataTabStyles = (euiTheme: EuiThemeComputed) => css`
  block-size: 100%;

  /* The doc viewer measures this off window.innerHeight, which overshoots the body.
     Its parent already has the right height, so just fill it. */
  [class*='table--containerHeight'] {
    height: 100%;
  }

  /* Pad the search and toggle rows only, so the table stays flush. Each row is found
     by the control inside it, not by position. */
  [class*='euiFlexItem']:has(
      > [class*='euiFormControlLayout'] [data-test-subj='unifiedDocViewerFieldsSearchInput'],
      > [class*='euiFlexGroup'] > [class*='euiFlexItem'] > [class*='euiSwitch']
    ) {
    padding-inline: ${euiTheme.size.m};
  }

  [data-test-subj='${METADATA_CALLOUT_TEST_SUBJ}'] {
    margin-block-start: ${euiTheme.size.m};
    margin-inline: ${euiTheme.size.m};
  }
`;

export interface AlertEpisodeDetailsFlyoutProps {
  episodeId: string;
  groupHash: string | undefined;
  onClose: () => void;
  services: AlertEpisodeDetailsServices;
  actions?: EpisodeAction[];
  getRuleDetailsHref: (ruleId: string) => string;
  getEpisodeDetailsHref: (episodeId: string) => string;
}

export const AlertEpisodeDetailsFlyout = ({
  episodeId,
  groupHash,
  onClose,
  services,
  actions,
  getRuleDetailsHref,
  getEpisodeDetailsHref,
}: AlertEpisodeDetailsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const [tab, setTab] = useState<TabId>('overview');
  const invalidateEpisodeQueries = useInvalidateEpisodeQueries();

  const {
    isLoading,
    ruleState,
    episode,
    status,
    severity,
    episodeAction,
    groupAction,
    isFlapping,
  } = useEpisodeDetailsHeaderData({ episodeId, groupHash, services });

  const showRuleDependentTabs = isRuleLoaded(ruleState);
  const episodes = useMemo(() => (episode ? [episode] : []), [episode]);
  const compatibleActions = useMemo(
    () => (actions && episodes.length ? actions.filter((a) => a.isCompatible({ episodes })) : []),
    [actions, episodes]
  );

  // Narrowest width that keeps the header's four info blocks on one row
  const initialWidth = INFO_BLOCKS_COLUMNS * INFO_BLOCKS_MIN_CELL_WIDTH + euiTheme.base * 2;

  // Footer "Take action" popover anchor, captured from the PrimaryAction button's onClick.
  const menuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setTab(tabId as TabId);
    // Close the action menu when switching tabs so its anchor cannot
    // be removed while the popover is still open.
    setIsMenuOpen(false);
  };

  // Metadata tab is only available when the rule is loaded.
  // Fall back to overview silently rather than leaving the user on a blank tab.
  const effectiveTab: TabId = !showRuleDependentTabs && tab === 'metadata' ? 'overview' : tab;

  const tabs = [
    {
      id: 'overview' as const,
      label: i18n.FLYOUT_TAB_OVERVIEW,
      'data-test-subj': 'alertingV2EpisodeFlyoutTabOverview',
    },
    {
      id: 'timeline' as const,
      label: i18n.FLYOUT_TAB_TIMELINE,
      'data-test-subj': 'alertingV2EpisodeFlyoutTabTimeline',
    },
    ...(showRuleDependentTabs
      ? [
          {
            id: 'metadata' as const,
            label: i18n.FLYOUT_TAB_METADATA,
            'data-test-subj': 'alertingV2EpisodeFlyoutTabMetadata',
          },
        ]
      : []),
  ];

  // Header badge data
  const isAcked = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isSnoozed = isEpisodeSnoozed(groupAction?.lastSnoozeAction, groupAction?.snoozeExpiry);
  const tags = groupAction?.tags ?? [];

  // Header title: show skeleton while loading, fall back to generic label if rule not found.
  const ruleName = isRuleLoaded(ruleState) ? ruleState.rule.metadata.name : undefined;
  const titleNode = isLoading ? (
    <EuiSkeletonTitle size="xs" />
  ) : (
    ruleName ?? i18n.HEADER_EPISODE_TITLE_FALLBACK
  );

  // Header description: triggered timestamp.
  const triggeredAt = episode?.triggered_at ?? undefined;
  const dateFormat = services.uiSettings.get('dateFormat') ?? undefined;
  const descriptionNode = triggeredAt ? formatDateTime(triggeredAt, dateFormat) : undefined;

  // Info block values
  const durationMs = episode?.duration;
  const assigneeUid = episode?.last_assignee_uid ?? undefined;

  // The edit assignee action owns its own picker popover, so the header can host it
  // directly instead of routing through the modal that `execute` opens.
  const assigneeInlineControl = actions
    ?.find(({ id }) => id === EDIT_EPISODE_ASSIGNEE_ACTION_ID)
    ?.renderInlineControl?.({
      episodes,
      onSuccess: invalidateEpisodeQueries,
      isDisabled: isLoading,
    });
  const normalizedSeverity = isSupportedEpisodeSeverity(severity)
    ? normalizeEpisodeSeverity(severity)
    : null;

  return (
    <>
      <FlyoutTemplate
        type="overlay"
        // Overlay without a mask, so the episodes table stays visible and clickable
        // behind the flyout. EUI only renders the mask when `ownFocus` is set.
        ownFocus={false}
        resizable
        // Main flyout in the episode history group. Anything opened from here with the
        // same historyKey navigates on top of it and can go back to it.
        session="start"
        // Our header title starts as a skeleton and becomes the rule name, which causes the flyout
        // to reopen quickly on first loads. Setting a constant title keeps the registration stable.
        flyoutMenuProps={{ title: i18n.FLYOUT_ARIA_LABEL }}
        historyKey={FLYOUT_HISTORY_KEY}
        paddingSize={FLYOUT_PADDING_SIZE}
        size={initialWidth}
        aria-label={i18n.FLYOUT_ARIA_LABEL}
        data-test-subj={FLYOUT_TEST_SUBJ}
        onClose={onClose}
        tabs={tabs}
        selectedTabId={effectiveTab}
        onTabChange={handleTabChange}
      >
        <FlyoutTemplate.Header title={titleNode} description={descriptionNode}>
          {/* Status badge */}
          {status && (
            <FlyoutTemplate.Header.Badge color={EPISODE_STATUS_BADGE_COLORS[status]}>
              {getEpisodeStatusBadgeLabel(status)}
            </FlyoutTemplate.Header.Badge>
          )}

          {/* Flapping badge */}
          {isFlapping && (
            <FlyoutTemplate.Header.Badge color="hollow" iconType="chartGauge">
              {i18n.FLYOUT_BADGE_FLAPPING}
            </FlyoutTemplate.Header.Badge>
          )}

          {/* Snoozed badge */}
          {isSnoozed && (
            <FlyoutTemplate.Header.Badge iconType="bellSlash">
              {i18n.FLYOUT_BADGE_SNOOZED}
            </FlyoutTemplate.Header.Badge>
          )}

          {/* Acknowledged badge */}
          {isAcked && (
            <FlyoutTemplate.Header.Badge iconType="checkCircle">
              {i18n.FLYOUT_BADGE_ACKNOWLEDGED}
            </FlyoutTemplate.Header.Badge>
          )}

          {/* Tag badges. The template handles +N overflow automatically above 5. */}
          {tags.map((tag) => (
            <FlyoutTemplate.Header.Badge key={tag} color="hollow">
              {tag}
            </FlyoutTemplate.Header.Badge>
          ))}

          {/* Alert ID, shortened and copyable. Same treatment as the table's unavailable rule cell. */}
          <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_ALERT_ID}>
            <CopyableShortId
              id={episodeId}
              copyTooltip={i18n.getFlyoutCopyAlertIdTooltip(episodeId)}
              copiedTooltip={i18n.FLYOUT_ALERT_ID_COPIED}
              data-test-subj="alertingV2EpisodeFlyoutAlertId"
            />
          </FlyoutTemplate.Header.InfoBlock>

          {/* Severity. The dot carries the color, so the value text stays default. */}
          {normalizedSeverity && (
            <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_SEVERITY}>
              <AlertEpisodeSeverityHealth
                severity={normalizedSeverity}
                data-test-subj="alertingV2EpisodeFlyoutSeverity"
              />
            </FlyoutTemplate.Header.InfoBlock>
          )}

          {/*
           * Assignee. The action's control anchors the picker to itself and covers both
           * the assigned and unassigned states, so it replaces the plain cell whenever
           * the action is available.
           */}
          <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_ASSIGNEE}>
            {assigneeInlineControl ?? (
              <AlertEpisodeAssigneeCell
                assigneeUid={assigneeUid}
                userProfile={services.userProfile}
              />
            )}
          </FlyoutTemplate.Header.InfoBlock>

          {/* Duration */}
          <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_DURATION}>
            {durationMs != null ? formatMetadataListDuration(durationMs) : EMPTY_VALUE}
          </FlyoutTemplate.Header.InfoBlock>
        </FlyoutTemplate.Header>

        <FlyoutTemplate.Body>
          {/* Overview tab: About / Investigation / Rule accordions */}
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            {/* Accordions sit closer together than their own content, so they get a wider gap. */}
            <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
              <FlyoutAccordion
                title={i18n.FLYOUT_ACCORDION_ABOUT}
                initialIsOpen
                hasBorder={false}
                data-test-subj="alertingV2EpisodeFlyoutAccordionAbout"
              >
                <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                  <AlertEpisodeGroupingSection
                    episodeId={episodeId}
                    services={services}
                    compressed
                  />
                  <AlertEpisodeTrendChartSection
                    episodeId={episodeId}
                    services={services}
                    compressed
                  />
                  <AlertEpisodeTimelineHeatmapsSection
                    episodeId={episodeId}
                    services={services}
                    compressed
                  />
                </EuiFlexGroup>
              </FlyoutAccordion>

              <FlyoutAccordion
                title={i18n.FLYOUT_ACCORDION_INVESTIGATION}
                initialIsOpen
                hasBorder={false}
                data-test-subj="alertingV2EpisodeFlyoutAccordionInvestigation"
              >
                <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                  <EuiPanel hasBorder paddingSize="m">
                    <AlertEpisodeRunbookSection
                      episodeId={episodeId}
                      services={services}
                      compressed
                      showTitle
                      onShowFullGuide={() => setIsRunbookOpen(true)}
                    />
                  </EuiPanel>
                  <EuiPanel hasBorder paddingSize="m">
                    <AlertEpisodesRelatedSection
                      episodeId={episodeId}
                      services={services}
                      getEpisodeDetailsHref={getEpisodeDetailsHref}
                      showHeading
                      compressed
                    />
                  </EuiPanel>
                </EuiFlexGroup>
              </FlyoutAccordion>

              <FlyoutAccordion
                title={i18n.FLYOUT_ACCORDION_RULE}
                initialIsOpen
                hasBorder={false}
                data-test-subj="alertingV2EpisodeFlyoutAccordionRule"
              >
                <AlertEpisodeRuleOverviewPanelSection
                  episodeId={episodeId}
                  services={services}
                  getRuleDetailsHref={getRuleDetailsHref}
                  // The Rule accordion already titles this section.
                  showTitle={false}
                  compressed
                />
              </FlyoutAccordion>
            </EuiFlexGroup>
          </FlyoutTemplate.Body.TabPanel>

          {/* Timeline tab */}
          <FlyoutTemplate.Body.TabPanel tabId="timeline">
            <AlertEpisodeTimelineSection
              episodeId={episodeId}
              groupHash={groupHash}
              services={services}
            />
          </FlyoutTemplate.Body.TabPanel>

          {/* Metadata tab, only mounted when the rule is loaded */}
          {showRuleDependentTabs && (
            <FlyoutTemplate.Body.TabPanel
              tabId="metadata"
              data-test-subj={METADATA_PANEL_TEST_SUBJ}
            >
              <Global styles={metadataBodyStyles} />
              <div className={METADATA_SCOPE_CLASS} css={metadataTabStyles(euiTheme)}>
                <AlertEpisodeMetadataSection
                  episodeId={episodeId}
                  services={services}
                  // Only needs to be non-zero: see DOC_VIEWER_FLEX_ACTIVATION_OFFSET.
                  decreaseAvailableHeightBy={DOC_VIEWER_FLEX_ACTIVATION_OFFSET}
                />
              </div>
            </FlyoutTemplate.Body.TabPanel>
          )}
        </FlyoutTemplate.Body>

        <FlyoutTemplate.Footer data-test-subj={FLYOUT_FOOTER_TEST_SUBJ}>
          <FlyoutTemplate.Footer.SecondaryAction
            label={i18n.FLYOUT_CLOSE}
            onClick={onClose}
            data-test-subj="alertingV2EpisodeFlyoutCloseButton"
          />
          <FlyoutTemplate.Footer.PrimaryAction
            label={i18n.FLYOUT_TAKE_ACTION}
            iconType="chevronSingleDown"
            data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
            onClick={(event) => {
              menuAnchorRef.current = event.currentTarget as HTMLButtonElement;
              setIsMenuOpen((prev) => !prev);
            }}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>

      {/* Full runbook as its own top-level flyout */}
      {isRunbookOpen && (
        <FlyoutTemplate
          type="overlay"
          // Matches the episode flyout: no mask, so both levels of the history group look
          // the same
          ownFocus={false}
          resizable
          session="start"
          historyKey={FLYOUT_HISTORY_KEY}
          paddingSize={FLYOUT_PADDING_SIZE}
          size={initialWidth}
          aria-label={i18n.RUNBOOK_FULL_GUIDE_ARIA_LABEL}
          data-test-subj="alertingV2EpisodeRunbookFlyout"
          onClose={() => {
            setIsRunbookOpen(false);
          }}
        >
          <FlyoutTemplate.Header title={i18n.RUNBOOK_TITLE} description={ruleName} />
          <FlyoutTemplate.Body>
            <AlertEpisodeRunbookSection episodeId={episodeId} services={services} />
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )}

      {/* The menu is rendered as a sibling of FlyoutTemplate so EuiWrappingPopover portals
          outside the flyout's stacking context (preventing it rendering behind the flyout). */}
      {menuAnchorRef.current && (
        <EpisodeFooterActionMenu
          anchor={menuAnchorRef.current}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          actions={compatibleActions}
          episodes={episodes}
          viewDetailsHref={getEpisodeDetailsHref(episodeId)}
          onSuccess={invalidateEpisodeQueries}
        />
      )}
    </>
  );
};
