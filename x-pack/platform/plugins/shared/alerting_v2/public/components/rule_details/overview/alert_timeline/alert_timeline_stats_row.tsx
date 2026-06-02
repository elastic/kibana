/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { formatDuration } from '@kbn/alerting-v2-episodes-ui/alert_timeline';

export interface AlertTimelineStatsRowProps {
  summary: AlertTimelineSummary;
}

export const AlertTimelineStatsRow: React.FC<AlertTimelineStatsRowProps> = ({ summary }) => {
  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      responsive={false}
      data-test-subj="alertTimelineStatsRow"
    >
      <EuiFlexItem>
        <EuiStat
          title={String(summary.stillOpen)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statEpisodesOpen', {
            defaultMessage: 'Episodes open',
          })}
          reverse
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatEpisodesOpen"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={String(summary.episodesStarted)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statEpisodesStarted', {
            defaultMessage: 'Episodes started',
          })}
          reverse
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatEpisodesStarted"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={String(summary.recovered)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statRecovered', {
            defaultMessage: 'Recovered',
          })}
          reverse
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatRecovered"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={formatDuration(summary.medianDurationMs, '—')}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statMedianDuration', {
            defaultMessage: 'Median duration',
          })}
          reverse
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatMedianDuration"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
