/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  logicalCSS,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
import { RelatedAlertEpisodesSection } from '../related_alert_episodes_section';

const EpisodeLifecycleHeatmap = React.lazy(() =>
  import('./episode_lifecycle_heatmap').then((module) => ({
    default: module.EpisodeLifecycleHeatmap,
  }))
);

interface EpisodeOverviewTabProps {
  episodeId: string;
  eventRows: EpisodeEventRow[];
  groupHash: string | undefined;
  rule: RuleResponse | undefined;
}

export const EpisodeOverviewTab = ({
  episodeId,
  eventRows,
  groupHash,
  rule,
}: EpisodeOverviewTabProps) => {
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      css={css`
        ${useEuiMaxBreakpoint('s')} {
          ${logicalCSS('padding-horizontal', '0')}
        }

        ${useEuiMinBreakpoint('m')} {
          height: 100%;
          overflow-y: auto;
          ${logicalCSS('padding-left', '0')}
        }
      `}
    >
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <EpisodeLifecycleHeatmap eventRows={eventRows} />
      </Suspense>
      <EuiSpacer size="l" />
      {rule ? (
        <RelatedAlertEpisodesSection
          currentEpisodeId={episodeId}
          groupHash={groupHash}
          rule={rule}
          ruleId={rule.id}
        />
      ) : null}
    </EuiPanel>
  );
};
