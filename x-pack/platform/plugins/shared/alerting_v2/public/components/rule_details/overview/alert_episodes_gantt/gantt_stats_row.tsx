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
import type { GanttSummary } from '../../../../utils/derive_gantt_data';
import { ganttStatusColor } from './gantt_status_palette';

const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export interface GanttStatsRowProps {
  summary: GanttSummary;
}

export const GanttStatsRow: React.FC<GanttStatsRowProps> = ({ summary }) => {
  const { euiTheme } = useEuiTheme();
  const recoveredColor = ganttStatusColor(euiTheme, ALERT_EPISODE_STATUS.RECOVERING);
  const stillOpenColor = ganttStatusColor(euiTheme, ALERT_EPISODE_STATUS.ACTIVE);

  return (
    <EuiFlexGroup gutterSize="xl" responsive={false} data-test-subj="ganttStatsRow">
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.episodesStarted)}
          description={i18n.translate('xpack.alertingV2.ruleDetails.gantt.statEpisodesStarted', {
            defaultMessage: 'Episodes started',
          })}
          titleSize="m"
          textAlign="left"
          data-test-subj="ganttStatEpisodesStarted"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.recovered)}
          description={i18n.translate('xpack.alertingV2.ruleDetails.gantt.statRecovered', {
            defaultMessage: 'Recovered',
          })}
          titleSize="m"
          titleColor={recoveredColor}
          textAlign="left"
          data-test-subj="ganttStatRecovered"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={String(summary.stillOpen)}
          description={i18n.translate('xpack.alertingV2.ruleDetails.gantt.statStillOpen', {
            defaultMessage: 'Still open',
          })}
          titleSize="m"
          titleColor={stillOpenColor}
          textAlign="left"
          data-test-subj="ganttStatStillOpen"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={formatDuration(summary.medianDurationMs)}
          description={i18n.translate('xpack.alertingV2.ruleDetails.gantt.statMedianDuration', {
            defaultMessage: 'Median duration',
          })}
          titleSize="m"
          textAlign="left"
          data-test-subj="ganttStatMedianDuration"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
