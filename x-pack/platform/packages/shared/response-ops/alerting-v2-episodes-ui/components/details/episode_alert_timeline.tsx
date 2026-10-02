/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AlertTimelineChart,
  AlertTimelineLegend,
  deriveEpisodeAlertTimelineData,
} from '../../alert_timeline';
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
  const baseTheme = services.charts.theme.useChartsBaseTheme();
  const timeZone = services.uiSettings.get<string>('dateFormat:tz', 'Browser');
  const timelineData = useMemo(
    () => deriveEpisodeAlertTimelineData(eventRows, Date.now()),
    [eventRows]
  );

  return (
    <div data-test-subj="alertingV2EpisodeAlertTimeline">
      <EuiTitle size={getPanelTitleSize(compressed)}>
        <h2>{i18n.ALERT_TIMELINE_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AlertTimelineLegend />
      <EuiHorizontalRule margin="m" />
      {timelineData ? (
        <AlertTimelineChart
          rows={[timelineData.row]}
          windowStartMs={timelineData.windowStartMs}
          windowEndMs={timelineData.windowEndMs}
          baseTheme={baseTheme}
          timeZone={timeZone}
        />
      ) : (
        <EuiEmptyPrompt
          title={<h3>{i18n.ALERT_TIMELINE_EMPTY_TITLE}</h3>}
          body={<p>{i18n.ALERT_TIMELINE_EMPTY_BODY}</p>}
          data-test-subj="alertingV2EpisodeAlertTimelineEmpty"
        />
      )}
    </div>
  );
};
