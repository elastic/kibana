/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import {
  alertTimelineStatusColor,
  formatDuration,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';

export interface AlertTimelineStatsRowProps {
  summary: AlertTimelineSummary;
}

export const AlertTimelineStatsRow: React.FC<AlertTimelineStatsRowProps> = ({ summary }) => {
  const { euiTheme } = useEuiTheme();
  const recoveredColor = alertTimelineStatusColor(euiTheme, ALERT_EPISODE_STATUS.INACTIVE);
  const stillOpenColor = alertTimelineStatusColor(euiTheme, ALERT_EPISODE_STATUS.ACTIVE);

  return (
    <EuiFlexGroup gutterSize="xl" responsive={false} data-test-subj="alertTimelineStatsRow">
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.episodesStarted)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statEpisodesStarted', {
            defaultMessage: 'Episodes started',
          })}
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatEpisodesStarted"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.recovered)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statRecovered', {
            defaultMessage: 'Recovered',
          })}
          titleSize="m"
          titleColor={recoveredColor}
          textAlign="left"
          data-test-subj="alertTimelineStatRecovered"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.stillOpen)}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statStillOpen', {
            defaultMessage: 'Still open',
          })}
          titleSize="m"
          titleColor={stillOpenColor}
          textAlign="left"
          data-test-subj="alertTimelineStatStillOpen"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={formatDuration(summary.medianDurationMs, '—')}
          description={i18n.translate('xpack.alertingV2.alertTimeline.statMedianDuration', {
            defaultMessage: 'Median duration',
          })}
          titleSize="m"
          textAlign="left"
          data-test-subj="alertTimelineStatMedianDuration"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
