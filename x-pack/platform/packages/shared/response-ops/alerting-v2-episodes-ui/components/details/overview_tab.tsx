/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
// We use this instead of FlyoutTemplate.Body.Accordion because the latter omits `hasBorder`
// and defaults it on, whereas we render subpanels ourselves.
import { FlyoutAccordion } from '@kbn/flyout-sections';
import type { AlertEpisode } from '../../queries/episodes_query';
import { isRuleLoaded, type RuleState } from '../../types/rule_state';
import { getConnectorSource } from '../../source_labels';
import { AlertEpisodeGroupingSection } from './grouping_section';
import { AlertEpisodeTrendChartSection } from './trend_chart_section';
import { AlertEpisodeTimelineHeatmapsSection } from './timeline_heatmaps_section';
import { AlertEpisodeRuleOverviewPanelSection } from './rule_overview_panel_section';
import { AlertEpisodesRelatedSection } from './related_section';
import { AlertEpisodeRunbookSection } from './runbook_section';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeOverviewTabProps {
  episodeId: string;
  /** Undefined while the episode loads. */
  episode: AlertEpisode | undefined;
  ruleState: RuleState;
  services: Pick<
    AlertEpisodeDetailsServices,
    'data' | 'http' | 'expressions' | 'spaces' | 'dataViews'
  >;
  getRuleDetailsHref: (ruleId: string) => string;
  getEpisodeDetailsHref: (episodeId: string) => string;
  /** Turns the runbook into a preview with a link that calls this. */
  onShowFullGuide?: () => void;
}

/** The overview of an episode, in About, Investigation and Rule accordions. */
export const AlertEpisodeOverviewTab = ({
  episodeId,
  episode,
  ruleState,
  services,
  getRuleDetailsHref,
  getEpisodeDetailsHref,
  onShowFullGuide,
}: AlertEpisodeOverviewTabProps) => {
  // No rule means no runbook, so the panel goes too.
  const showRunbook = isRuleLoaded(ruleState);
  // Related episodes are matched by rule or external source. Until the episode loads the
  // section renders its own loading or error state, so the panel stays.
  const showRelated =
    !episode || Boolean(episode['rule.id']) || getConnectorSource(episode.source) !== undefined;

  return (
    // Accordions sit closer together than their own content, so they get a wider gap.
    <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
      <FlyoutAccordion
        title={i18n.FLYOUT_ACCORDION_ABOUT}
        initialIsOpen
        hasBorder={false}
        data-test-subj="alertingV2EpisodeFlyoutAccordionAbout"
      >
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          <AlertEpisodeGroupingSection episodeId={episodeId} services={services} compressed />
          <AlertEpisodeTrendChartSection episodeId={episodeId} services={services} compressed />
          <AlertEpisodeTimelineHeatmapsSection
            episodeId={episodeId}
            services={services}
            compressed
          />
        </EuiFlexGroup>
      </FlyoutAccordion>

      {(showRunbook || showRelated) && (
        <FlyoutAccordion
          title={i18n.FLYOUT_ACCORDION_INVESTIGATION}
          initialIsOpen
          hasBorder={false}
          data-test-subj="alertingV2EpisodeFlyoutAccordionInvestigation"
        >
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            {showRunbook && (
              <EuiPanel hasBorder paddingSize="m">
                <AlertEpisodeRunbookSection
                  episodeId={episodeId}
                  services={services}
                  compressed
                  showTitle
                  onShowFullGuide={onShowFullGuide}
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
  );
};
