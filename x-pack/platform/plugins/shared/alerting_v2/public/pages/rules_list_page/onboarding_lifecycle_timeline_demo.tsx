/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  AlertTimelineChart,
  deriveEpisodeAlertTimelineData,
  deriveEpisodeSeverityTimelineData,
  EpisodeSeverityTimelineRow,
  formatTimestamp,
  type EpisodeSeverityTimelineTransition,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { SeverityHeatmapDetailPanel } from '@kbn/alerting-v2-episodes-ui/components/details/severity_heatmap_detail_panel';
import {
  ALERT_TIMELINE_LIFECYCLE_LANE_LABEL,
  ALERT_TIMELINE_SEVERITY_LANE_LABEL,
  ALERT_TIMELINE_TITLE,
} from '@kbn/alerting-v2-episodes-ui/components/details/translations';
import { getEpisodeSeverityLabel } from '@kbn/alerting-v2-episodes-ui/components/severity/severity_utils';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';

/** Fixed window so the demo chart stays stable across renders. */
const DEMO_WINDOW_END_MS = Date.parse('2026-03-20T11:42:00.000Z');

const DEMO_EVENT_ROWS: EpisodeEventRow[] = [
  {
    '@timestamp': '2026-03-20T11:32:00.000Z',
    'episode.id': 'demo-episode-1',
    'episode.status': ALERT_EPISODE_STATUS.PENDING,
    'rule.id': 'demo-rule',
    group_hash: 'demo-group',
    severity: 'medium',
    data: '{"host.name":"web-01","avg_cpu_pct":87}',
  },
  {
    '@timestamp': '2026-03-20T11:36:00.000Z',
    'episode.id': 'demo-episode-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'demo-rule',
    group_hash: 'demo-group',
    severity: 'high',
    data: '{"host.name":"web-01","avg_cpu_pct":94}',
  },
  {
    '@timestamp': '2026-03-20T11:40:00.000Z',
    'episode.id': 'demo-episode-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'demo-rule',
    group_hash: 'demo-group',
    severity: 'critical',
    data: '{"host.name":"web-01","avg_cpu_pct":98}',
  },
];

/**
 * Interactive Alert series demo (lifecycle + severity) for onboarding —
 * same cards as the alert detail flyout, with static sample events.
 */
export const OnboardingLifecycleTimelineDemo = (): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const uiSettings = useService(CoreStart('uiSettings'));
  const baseTheme = charts.theme.useChartsBaseTheme();
  const timeZone = uiSettings.get<string>('dateFormat:tz', 'Browser');
  const [selectedSeverityTransition, setSelectedSeverityTransition] =
    useState<EpisodeSeverityTimelineTransition | null>(null);

  const timelineData = useMemo(
    () => deriveEpisodeAlertTimelineData(DEMO_EVENT_ROWS, DEMO_WINDOW_END_MS),
    []
  );
  const severityTimelineData = useMemo(
    () =>
      timelineData
        ? deriveEpisodeSeverityTimelineData(DEMO_EVENT_ROWS, timelineData.windowEndMs)
        : { segments: [], transitions: [] },
    [timelineData]
  );

  if (!timelineData) {
    return <></>;
  }

  return (
    <div
      data-test-subj="alertingOnboardingLifecycleTimelineDemo"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      <EuiTitle size="xxs">
        <h4>{ALERT_TIMELINE_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.alertingV2.rulesList.onboardingModal.lifecycleDemo.hint', {
            defaultMessage:
              'Example alert series — hover segments for timing, select a severity marker for details.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <AlertTimelineChart
        rows={[timelineData.row]}
        windowStartMs={timelineData.windowStartMs}
        windowEndMs={timelineData.windowEndMs}
        baseTheme={baseTheme}
        timeZone={timeZone}
        showEpisodeId={false}
        labelColumnWidth={64}
        renderSeriesLabel={() => (
          <EuiText size="xs">{ALERT_TIMELINE_LIFECYCLE_LANE_LABEL}</EuiText>
        )}
        customRows={
          severityTimelineData.transitions.length > 0
            ? [
                {
                  id: 'severity',
                  label: <EuiText size="xs">{ALERT_TIMELINE_SEVERITY_LANE_LABEL}</EuiText>,
                  render: (rowProps) => (
                    <EpisodeSeverityTimelineRow
                      segments={severityTimelineData.segments}
                      transitions={severityTimelineData.transitions}
                      onTransitionClick={setSelectedSeverityTransition}
                      {...rowProps}
                    />
                  ),
                },
              ]
            : []
        }
      />
      {selectedSeverityTransition ? (
        <>
          <EuiSpacer size="s" />
          <SeverityHeatmapDetailPanel
            severityLabel={getEpisodeSeverityLabel(selectedSeverityTransition.severity)}
            timestamp={formatTimestamp(selectedSeverityTransition.timestampMs, timeZone)}
            eventData={selectedSeverityTransition.eventData}
            euiTheme={euiTheme}
            onClose={() => setSelectedSeverityTransition(null)}
          />
        </>
      ) : null}
    </div>
  );
};
