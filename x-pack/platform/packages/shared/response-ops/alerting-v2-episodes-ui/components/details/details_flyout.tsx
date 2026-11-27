/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiLink, EuiPanel, EuiToolTip } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import { alertAttachmentConverter, useManualAddToChat } from '@kbn/alerting-v2-browser-shared';
import type { FocusedEpisode } from '@kbn/alerting-v2-browser-shared';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import { FlyoutTemplate } from '@kbn/flyout-template';
// We use this instead of FlyoutTemplate.Body.Accordion because the latter omits `hasBorder`
// and defaults it on, whereas we render subpanels ourselves.
import { FlyoutAccordion } from '@kbn/flyout-sections';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { EDIT_EPISODE_ASSIGNEE_ACTION_ID } from '../../actions/edit_assignee';
import { useInvalidateEpisodeQueries } from '../../hooks/use_invalidate_episode_queries';
import { useEpisodeDetailsHeaderData } from '../../hooks/use_episode_details_header_data';
import { isRuleLoaded } from '../../types/rule_state';
import { isEpisodeSnoozed } from '../../utils/is_episode_snoozed';
import { isSupportedEpisodeSeverity, normalizeEpisodeSeverity } from '../severity/severity_utils';
import { AlertEpisodeSeverityBadge } from '../severity/episode_severity_badge';
import { AlertEpisodeStatusHealth } from '../status/status_badge';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { UserProfileDisplay } from '../user_profile_display';
import { CopyableShortId } from '../copyable_short_id';
import { AlertEpisodeGroupingSection } from './grouping_section';
import { AlertEpisodeTrendChartSection } from './trend_chart_section';
import { AlertEpisodeTimelineHeatmapsSection } from './timeline_heatmaps_section';
import { AlertEpisodeRuleOverviewPanelSection } from './rule_overview_panel_section';
import { AlertEpisodesRelatedSection } from './related_section';
import { AlertEpisodeRunbookSection } from './runbook_section';
import { AlertEpisodeTimelineSection } from './timeline_section';
import { AlertEpisodeMetadataSection } from './metadata_section';
import { DOC_VIEWER_FLEX_HEIGHT_SENTINEL } from './metadata_layout';
import { buildEpisodeMenuPanels } from './build_episode_menu_panels';
import { EMPTY_VALUE } from '../../constants';
import { getConnectorSource, useEpisodeSource } from '../../source_labels';
import { formatDateTime } from '../../utils/format_date_time';
import { formatMetadataListDuration } from './translations';
import { AlertDetailsFrame, useAlertDetailsFrame } from './alert_details_frame';
import {
  AlertDetailsTitleSkeleton,
  AlertDetailsValueSkeleton,
  AlertEpisodeDescriptionListSkeleton,
} from './section_skeletons';
import type { EpisodeAction } from '../../actions/types';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';
import * as flappingI18n from '../flapping/translations';
import { FlappingPopover } from '../flapping/flapping_badge';

type TabId = 'overview' | 'timeline' | 'metadata';

export const ALERT_EPISODE_DETAILS_FLYOUT_TEST_SUBJ = 'alertingV2EpisodeFlyout';
const FLYOUT_FOOTER_TEST_SUBJ = 'alertingV2EpisodeFlyoutFooter';
const METADATA_PANEL_TEST_SUBJ = 'alertingV2EpisodeFlyoutMetadataPanel';
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

/** Fills the flyout body. */
const metadataTabStyles = css`
  block-size: 100%;
`;

const interactiveBadgeLabelCss = css`
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
`;

const FlappingBadgeLabel = () => (
  <FlappingPopover
    renderButton={(onClick) => (
      <button
        type="button"
        css={interactiveBadgeLabelCss}
        aria-label={flappingI18n.FLAPPING_BADGE_ARIA_LABEL}
        data-test-subj="alertingV2EpisodeFlyoutFlappingBadgeTrigger"
        onClick={onClick}
      >
        {i18n.FLYOUT_BADGE_FLAPPING}
      </button>
    )}
  />
);

const SnoozedBadgeLabel = ({
  expiry,
  dateFormat,
}: {
  expiry: string | null | undefined;
  dateFormat: string | undefined;
}) => (
  <EuiToolTip
    anchorProps={{ css: { display: 'flex' } }}
    content={
      expiry
        ? i18n.getFlyoutSnoozedUntilTooltip(formatDateTime(expiry, dateFormat))
        : i18n.FLYOUT_SNOOZED_TOOLTIP_UNKNOWN_EXPIRY
    }
  >
    <span tabIndex={0} data-test-subj="alertingV2EpisodeFlyoutSnoozedBadgeTrigger">
      {i18n.FLYOUT_BADGE_SNOOZED}
    </span>
  </EuiToolTip>
);

export interface AlertEpisodeDetailsFlyoutProps {
  episodeId: string;
  groupHash: string | undefined;
  sourceId?: string;
  onClose: () => void;
  services: AlertEpisodeDetailsServices;
  actions?: EpisodeAction[];
  getRuleDetailsHref: (ruleId: string) => string;
  getEpisodeDetailsHref: (episodeId: string) => string;
}

/**
 * Universal alert details, declared as `FlyoutTemplate` content. Render it inside an
 * `AlertDetailsFrame`, or use `AlertEpisodeDetailsFlyout` for a standalone flyout.
 */
export const AlertEpisodeDetailsFlyoutContent = ({
  episodeId,
  groupHash,
  sourceId,
  onClose,
  services,
  actions,
  getRuleDetailsHref,
  getEpisodeDetailsHref,
}: AlertEpisodeDetailsFlyoutProps) => {
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
    isActionStateLoaded,
    isFlapping,
  } = useEpisodeDetailsHeaderData({ episodeId, groupHash, services });
  const { label: systemLabel, icon: systemIcon } = useEpisodeSource(sourceId);
  // Alerts ingested from an external connector show that connector (e.g. "zabbix");
  // everything else shows the alerting system (Universal or Classic).
  const connectorSource = getConnectorSource(episode?.source);
  const sourceLabel = connectorSource ?? systemLabel;
  const sourceIcon = connectorSource ? ConnectorIconsMap.get(`.${connectorSource}`) : systemIcon;

  const showRuleDependentTabs = isRuleLoaded(ruleState);
  // The Metadata tab shows while the rule may still load, so the tab bar does not change late.
  const showMetadataTab = showRuleDependentTabs || isLoading;
  // Related episodes are matched by rule or external source. Until the episode loads the
  // section renders its own loading or error state, so the panel stays.
  const showRelated = !episode || Boolean(episode['rule.id']) || connectorSource !== undefined;
  // The actions depend on the action state, so they wait for it to load.
  const episodes = useMemo(
    () => (episode && isActionStateLoaded ? [episode] : []),
    [episode, isActionStateLoaded]
  );
  const compatibleActions = useMemo(
    () => (actions && episodes.length ? actions.filter((a) => a.isCompatible({ episodes })) : []),
    [actions, episodes]
  );
  const menuActions = useMemo(
    () =>
      actions && episodes.length
        ? actions.filter(
            (action) =>
              action.isCompatible({ episodes }) || Boolean(action.showWhenDisabled?.({ episodes }))
          )
        : [],
    [actions, episodes]
  );

  const viewDetailsHref = getEpisodeDetailsHref(episodeId);
  const loadedRule = isRuleLoaded(ruleState) ? ruleState.rule : undefined;
  const focusedEpisode = useMemo<FocusedEpisode | undefined>(() => {
    if (!episode) {
      return undefined;
    }
    const { rule_name: episodeDataRuleName } = parseEpisodeDataJson(episode.episode_data);
    return {
      episode,
      ruleName:
        loadedRule?.metadata.name ??
        (typeof episodeDataRuleName === 'string' ? episodeDataRuleName : undefined),
      groupingFields: loadedRule?.grouping?.fields,
    };
  }, [episode, loadedRule]);
  const { addToChat, isAddToChatAvailable } = useManualAddToChat(
    focusedEpisode,
    alertAttachmentConverter,
    { agentBuilder: services.agentBuilder, application: services.application }
  );
  const takeActionPanels = useMemo(
    () =>
      buildEpisodeMenuPanels({
        actions: menuActions,
        episodes,
        viewDetailsHref,
        onSuccess: invalidateEpisodeQueries,
      }),
    [menuActions, episodes, viewDetailsHref, invalidateEpisodeQueries]
  );

  const { openStackedFlyout } = useAlertDetailsFrame();

  const handleTabChange = (tabId: string) => {
    setTab(tabId as TabId);
  };

  /*
   * The Metadata tab goes away when the rule cannot load. Fall back to overview silently rather
   * than leaving the user on a blank tab.
   */
  const effectiveTab: TabId = !showMetadataTab && tab === 'metadata' ? 'overview' : tab;

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
    ...(showMetadataTab
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
  const isResolved = episodeAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const isSnoozed = isEpisodeSnoozed(groupAction?.lastSnoozeAction, groupAction?.snoozedUntil);
  const tags = episodeAction?.tags ?? [];

  // Header title: show skeleton while loading, fall back to generic label if rule not found.
  const ruleName = isRuleLoaded(ruleState) ? ruleState.rule.metadata.name : undefined;
  const titleNode = isLoading ? (
    <AlertDetailsTitleSkeleton />
  ) : (
    ruleName ?? i18n.HEADER_EPISODE_TITLE_FALLBACK
  );

  const openFullRunbook = () =>
    openStackedFlyout({
      title: i18n.RUNBOOK_TITLE,
      description: ruleName,
      body: <AlertEpisodeRunbookSection episodeId={episodeId} services={services} />,
      'aria-label': i18n.RUNBOOK_FULL_GUIDE_ARIA_LABEL,
      'data-test-subj': 'alertingV2EpisodeRunbookFlyout',
    });

  // Header description: triggered timestamp.
  const triggeredAt = episode?.triggered_at ?? undefined;
  const dateFormat = services.uiSettings.get('dateFormat') ?? undefined;
  const descriptionSkeleton = isLoading ? <AlertDetailsValueSkeleton width={160} /> : undefined;
  const descriptionNode = triggeredAt
    ? formatDateTime(triggeredAt, dateFormat)
    : descriptionSkeleton;
  const emptyValue = isLoading ? <AlertDetailsValueSkeleton /> : EMPTY_VALUE;

  // Info block values
  const durationMs = episode?.duration;
  const assigneeUid = episodeAction?.lastAssigneeUid ?? undefined;
  const episodeData = parseEpisodeDataJson(episode?.episode_data);
  const rawAlertUrl =
    typeof episodeData.source_alert_url === 'string' && episodeData.source_alert_url.length > 0
      ? episodeData.source_alert_url
      : undefined;
  const alertUrl = rawAlertUrl && /^https?:\/\//i.test(rawAlertUrl) ? rawAlertUrl : undefined;

  // The edit assignee action owns its own picker popover, so the header can host it
  // directly instead of routing through the modal that `execute` opens.
  const assigneeInlineControl = compatibleActions
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
    <FlyoutTemplate
      onClose={onClose}
      tabs={tabs}
      selectedTabId={effectiveTab}
      onTabChange={handleTabChange}
    >
      <FlyoutTemplate.Header title={titleNode} description={descriptionNode}>
        {(status || isLoading) && (
          <FlyoutTemplate.Header.Badge color="hollow">
            {status ? (
              <AlertEpisodeStatusHealth status={status} />
            ) : (
              <AlertDetailsValueSkeleton width={56} height={12} />
            )}
          </FlyoutTemplate.Header.Badge>
        )}

        {/* Flapping badge */}
        {isFlapping && (
          <FlyoutTemplate.Header.Badge color="hollow" iconType="chartGauge">
            <FlappingBadgeLabel />
          </FlyoutTemplate.Header.Badge>
        )}

        {/* Snoozed badge */}
        {isSnoozed && (
          <FlyoutTemplate.Header.Badge iconType="bellSlash">
            <SnoozedBadgeLabel expiry={groupAction?.snoozedUntil} dateFormat={dateFormat} />
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

        {/* Source: which alerting system the alert came from. */}
        <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_SOURCE}>
          <Suspense fallback={null}>
            <EuiBadge
              color="hollow"
              iconType={sourceIcon}
              data-test-subj="alertingV2EpisodeFlyoutSourceBadge"
            >
              {sourceLabel}
            </EuiBadge>
          </Suspense>
        </FlyoutTemplate.Header.InfoBlock>

        {(normalizedSeverity || isLoading) && (
          <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_SEVERITY}>
            {normalizedSeverity ? (
              <span data-test-subj="alertingV2EpisodeFlyoutSeverity">
                <AlertEpisodeSeverityBadge severity={normalizedSeverity} />
              </span>
            ) : (
              emptyValue
            )}
          </FlyoutTemplate.Header.InfoBlock>
        )}

        {/*
         * Assignee. The action's control anchors the picker to itself and covers both
         * the assigned and unassigned states, so it replaces the plain cell whenever
         * the action is available.
         */}
        <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_ASSIGNEE}>
          {isLoading ? (
            <AlertDetailsValueSkeleton />
          ) : (
            assigneeInlineControl ?? (
              <AlertEpisodeAssigneeCell
                assigneeUid={assigneeUid}
                userProfile={services.userProfile}
              />
            )
          )}
        </FlyoutTemplate.Header.InfoBlock>

        {/* Duration */}
        <FlyoutTemplate.Header.InfoBlock title={i18n.FLYOUT_INFO_BLOCK_DURATION}>
          {durationMs != null ? formatMetadataListDuration(durationMs) : emptyValue}
        </FlyoutTemplate.Header.InfoBlock>

        {alertUrl && (
          <FlyoutTemplate.Header.InfoBlock title={i18n.METADATA_LIST_SOURCE_URL_LABEL}>
            <EuiLink
              href={alertUrl}
              target="_blank"
              external
              data-test-subj="alertingV2EpisodeFlyoutAlertUrl"
            >
              {i18n.METADATA_LIST_SOURCE_URL_LINK}
            </EuiLink>
          </FlyoutTemplate.Header.InfoBlock>
        )}

        {isAcked && (
          <FlyoutTemplate.Header.InfoBlock title={i18n.ACTIONS_OVERVIEW_ACKNOWLEDGED_BY}>
            <UserProfileDisplay
              userProfileUid={episodeAction?.lastAckActor}
              userProfile={services.userProfile}
            />
          </FlyoutTemplate.Header.InfoBlock>
        )}

        {isResolved && (
          <FlyoutTemplate.Header.InfoBlock title={i18n.ACTIONS_OVERVIEW_RESOLVED_BY}>
            <UserProfileDisplay
              userProfileUid={episodeAction?.lastDeactivateActor}
              userProfile={services.userProfile}
            />
          </FlyoutTemplate.Header.InfoBlock>
        )}

        {isSnoozed && (
          <FlyoutTemplate.Header.InfoBlock title={i18n.ACTIONS_OVERVIEW_SNOOZED_BY}>
            <UserProfileDisplay
              userProfileUid={groupAction?.lastSnoozeActor}
              userProfile={services.userProfile}
            />
          </FlyoutTemplate.Header.InfoBlock>
        )}
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
                <AlertEpisodeGroupingSection episodeId={episodeId} services={services} compressed />
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

            {(showRuleDependentTabs || showRelated) && (
              <FlyoutAccordion
                title={i18n.FLYOUT_ACCORDION_INVESTIGATION}
                initialIsOpen
                hasBorder={false}
                data-test-subj="alertingV2EpisodeFlyoutAccordionInvestigation"
              >
                <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                  {/* No rule means no runbook, so the panel goes too. */}
                  {showRuleDependentTabs && (
                    <EuiPanel hasBorder paddingSize="m">
                      <AlertEpisodeRunbookSection
                        episodeId={episodeId}
                        services={services}
                        compressed
                        showTitle
                        onShowFullGuide={openFullRunbook}
                      />
                    </EuiPanel>
                  )}
                  {/* No rule or source means nothing to relate by, so the panel goes too. */}
                  {showRelated && (
                    <EuiPanel hasBorder paddingSize="m">
                      <AlertEpisodesRelatedSection
                        episodeId={episodeId}
                        services={services}
                        getEpisodeDetailsHref={getEpisodeDetailsHref}
                        showHeading
                        compressed
                      />
                    </EuiPanel>
                  )}
                </EuiFlexGroup>
              </FlyoutAccordion>
            )}

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
            seriesId={episode ? episode.series_id ?? null : undefined}
            groupHash={episode?.group_hash}
            services={services}
          />
        </FlyoutTemplate.Body.TabPanel>

        {/* Metadata tab */}
        {showMetadataTab && (
          <FlyoutTemplate.Body.TabPanel tabId="metadata" data-test-subj={METADATA_PANEL_TEST_SUBJ}>
            {showRuleDependentTabs ? (
              <>
                <Global styles={metadataBodyStyles} />
                <div
                  className={METADATA_SCOPE_CLASS}
                  css={metadataTabStyles}
                  data-test-subj="alertingV2EpisodeFlyoutMetadataScope"
                >
                  <AlertEpisodeMetadataSection
                    episodeId={episodeId}
                    services={services}
                    decreaseAvailableHeightBy={DOC_VIEWER_FLEX_HEIGHT_SENTINEL}
                    calloutMarginSize="m"
                    controlsPaddingSize="m"
                  />
                </div>
              </>
            ) : (
              <AlertEpisodeDescriptionListSkeleton
                aria-label={i18n.FLYOUT_METADATA_LOADING}
                data-test-subj="alertingV2EpisodeFlyoutMetadataSkeleton"
              />
            )}
          </FlyoutTemplate.Body.TabPanel>
        )}
      </FlyoutTemplate.Body>

      <FlyoutTemplate.Footer data-test-subj={FLYOUT_FOOTER_TEST_SUBJ}>
        {isAddToChatAvailable && (
          <FlyoutTemplate.Footer.SecondaryAction
            variant="ai"
            iconType="addToChat"
            onClick={addToChat}
            data-test-subj="alertingV2EpisodeFlyoutAddToChatButton"
          />
        )}
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label={i18n.FLYOUT_TAKE_ACTION}
          aria-label={i18n.FLYOUT_TAKE_ACTION}
          panels={takeActionPanels}
          data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
};

/**
 * Universal alert details in a standalone flyout.
 */
export const AlertEpisodeDetailsFlyout = (props: AlertEpisodeDetailsFlyoutProps) => {
  const { onClose } = props;
  return (
    <AlertDetailsFrame onClose={onClose} data-test-subj={ALERT_EPISODE_DETAILS_FLYOUT_TEST_SUBJ}>
      <AlertEpisodeDetailsFlyoutContent {...props} />
    </AlertDetailsFrame>
  );
};
