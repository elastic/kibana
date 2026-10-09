/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AlertTimelineChart,
  deriveEpisodeAlertTimelineData,
  deriveEpisodeSeverityTimelineData,
  EpisodeSeverityTimelineRow,
  formatTimestamp,
  type EpisodeSeverityTimelineTransition,
} from '../../alert_timeline';
import { getEpisodeSeverityLabel } from '../severity/severity_utils';
import { SeverityHeatmapDetailPanel } from './severity_heatmap_detail_panel';
import { getPanelTitleSize } from './panel_title_sizes';
import * as i18n from './translations';

interface AlertEpisodeAlertTimelineServices {
  charts: ChartsPluginStart;
  uiSettings: IUiSettingsClient;
}

export interface AlertEpisodeAlertTimelineProps {
  eventRows: EpisodeEventRow[];
  compressed?: boolean;
}

export const AlertEpisodeAlertTimeline = ({
  eventRows,
  compressed,
}: AlertEpisodeAlertTimelineProps) => {
  const { services } = useKibana<AlertEpisodeAlertTimelineServices>();
  const { euiTheme } = useEuiTheme();
  const [selectedSeverityTransition, setSelectedSeverityTransition] =
    useState<EpisodeSeverityTimelineTransition | null>(null);
  const baseTheme = services.charts.theme.useChartsBaseTheme();
  const timeZone = services.uiSettings.get<string>('dateFormat:tz', 'Browser');
  const timelineData = useMemo(
    () => deriveEpisodeAlertTimelineData(eventRows, Date.now()),
    [eventRows]
  );
  const severityTimelineData = useMemo(
    () =>
      timelineData
        ? deriveEpisodeSeverityTimelineData(eventRows, timelineData.windowEndMs)
        : { segments: [], transitions: [] },
    [eventRows, timelineData]
  );

  return (
    <div data-test-subj="alertingV2EpisodeAlertTimeline">
      <EuiTitle size={getPanelTitleSize(compressed)}>
        <h2>{i18n.ALERT_TIMELINE_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {timelineData ? (
        <AlertTimelineChart
          rows={[timelineData.row]}
          windowStartMs={timelineData.windowStartMs}
          windowEndMs={timelineData.windowEndMs}
          baseTheme={baseTheme}
          timeZone={timeZone}
          showEpisodeId={false}
          labelColumnWidth={64}
          renderSeriesLabel={() => (
            <EuiText size="xs">{i18n.ALERT_TIMELINE_LIFECYCLE_LANE_LABEL}</EuiText>
          )}
          customRows={
            severityTimelineData.transitions.length > 0
              ? [
                  {
                    id: 'severity',
                    label: <EuiText size="xs">{i18n.ALERT_TIMELINE_SEVERITY_LANE_LABEL}</EuiText>,
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
      ) : (
        <EuiEmptyPrompt
          title={<h3>{i18n.ALERT_TIMELINE_EMPTY_TITLE}</h3>}
          body={<p>{i18n.ALERT_TIMELINE_EMPTY_BODY}</p>}
          data-test-subj="alertingV2EpisodeAlertTimelineEmpty"
        />
      )}
      {selectedSeverityTransition && (
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
      )}
    </div>
  );
};
