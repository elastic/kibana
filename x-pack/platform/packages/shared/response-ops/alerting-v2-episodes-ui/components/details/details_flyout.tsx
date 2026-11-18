/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSkeletonTitle } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { useInvalidateEpisodeQueries } from '../../hooks/use_invalidate_episode_queries';
import { useEpisodeDetailsHeaderData } from '../../hooks/use_episode_details_header_data';
import { isRuleLoaded } from '../../types/rule_state';
import { useEpisodeDetailsHeaderParts } from './use_episode_details_header_parts';
import { AlertEpisodeOverviewTab } from './overview_tab';
import { AlertEpisodeRunbookFlyout } from './runbook_flyout';
import { AlertEpisodeTimelineSection } from './timeline_section';
import { AlertEpisodeMetadataSection } from './metadata_section';
import { DOC_VIEWER_FLEX_HEIGHT_SENTINEL } from './metadata_layout';
import { buildEpisodeMenuPanels } from './build_episode_menu_panels';
import { useAlertDetailsFlyoutWidth } from './use_alert_details_flyout_width';
import type { EpisodeAction } from '../../actions/types';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

type TabId = 'overview' | 'timeline' | 'metadata';

/**
 * Groups the episode flyout and anything opened from it into one navigation history.
 */
const FLYOUT_HISTORY_KEY = Symbol('alertingV2EpisodeDetails');

const FLYOUT_TEST_SUBJ = 'alertingV2EpisodeFlyout';
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

export const AlertEpisodeDetailsFlyout = ({
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

  const headerData = useEpisodeDetailsHeaderData({ episodeId, groupHash, services });
  const { isLoading, ruleState, episode, isActionStateLoaded } = headerData;
  const {
    description: descriptionNode,
    badges,
    infoBlocks,
  } = useEpisodeDetailsHeaderParts({
    episodeId,
    sourceId,
    headerData,
    services,
    actions,
    onActionSuccess: invalidateEpisodeQueries,
  });

  const showRuleDependentTabs = isRuleLoaded(ruleState);
  // The actions depend on the action state, so they wait for it to load.
  const episodes = useMemo(
    () => (episode && isActionStateLoaded ? [episode] : []),
    [episode, isActionStateLoaded]
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

  const initialWidth = useAlertDetailsFlyoutWidth();

  const viewDetailsHref = getEpisodeDetailsHref(episodeId);
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
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setTab(tabId as TabId);
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

  // Header title: show skeleton while loading, fall back to generic label if rule not found.
  const ruleName = isRuleLoaded(ruleState) ? ruleState.rule.metadata.name : undefined;
  const titleNode = isLoading ? (
    <EuiSkeletonTitle size="xs" />
  ) : (
    ruleName ?? i18n.HEADER_EPISODE_TITLE_FALLBACK
  );

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
        size={initialWidth}
        aria-label={i18n.FLYOUT_ARIA_LABEL}
        data-test-subj={FLYOUT_TEST_SUBJ}
        onClose={onClose}
        tabs={tabs}
        selectedTabId={effectiveTab}
        onTabChange={handleTabChange}
      >
        <FlyoutTemplate.Header title={titleNode} description={descriptionNode}>
          {/* The template handles +N overflow automatically above 5 badges. */}
          {badges.map(({ id, label, ...badgeProps }) => (
            <FlyoutTemplate.Header.Badge key={id} {...badgeProps}>
              {label}
            </FlyoutTemplate.Header.Badge>
          ))}

          {infoBlocks.map(({ id, value, ...blockProps }) => (
            <FlyoutTemplate.Header.InfoBlock key={id} {...blockProps}>
              {value}
            </FlyoutTemplate.Header.InfoBlock>
          ))}
        </FlyoutTemplate.Header>

        <FlyoutTemplate.Body>
          {/* Overview tab: About / Investigation / Rule accordions */}
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <AlertEpisodeOverviewTab
              episodeId={episodeId}
              episode={episode}
              ruleState={ruleState}
              services={services}
              getRuleDetailsHref={getRuleDetailsHref}
              getEpisodeDetailsHref={getEpisodeDetailsHref}
              onShowFullGuide={() => setIsRunbookOpen(true)}
            />
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

          {/* Metadata tab, only mounted when the rule is loaded */}
          {showRuleDependentTabs && (
            <FlyoutTemplate.Body.TabPanel
              tabId="metadata"
              data-test-subj={METADATA_PANEL_TEST_SUBJ}
            >
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
            </FlyoutTemplate.Body.TabPanel>
          )}
        </FlyoutTemplate.Body>

        <FlyoutTemplate.Footer data-test-subj={FLYOUT_FOOTER_TEST_SUBJ}>
          <FlyoutTemplate.Footer.SecondaryAction
            label={i18n.FLYOUT_CLOSE}
            onClick={onClose}
            data-test-subj="alertingV2EpisodeFlyoutCloseButton"
          />
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={i18n.FLYOUT_TAKE_ACTION}
            aria-label={i18n.FLYOUT_TAKE_ACTION}
            panels={takeActionPanels}
            data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>

      {/* Full runbook as its own top-level flyout */}
      {isRunbookOpen && (
        <AlertEpisodeRunbookFlyout
          episodeId={episodeId}
          ruleName={ruleName}
          services={services}
          historyKey={FLYOUT_HISTORY_KEY}
          onClose={() => {
            setIsRunbookOpen(false);
          }}
        />
      )}
    </>
  );
};
