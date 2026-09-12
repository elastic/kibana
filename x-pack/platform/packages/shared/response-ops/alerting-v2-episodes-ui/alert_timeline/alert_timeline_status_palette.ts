/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';

export const alertTimelineStatusColor = (
  euiTheme: EuiThemeComputed,
  status: AlertEpisodeStatus
): string => {
  switch (status) {
    case ALERT_EPISODE_STATUS.PENDING:
      return euiTheme.colors.warning;
    case ALERT_EPISODE_STATUS.ACTIVE:
      return euiTheme.colors.vis.euiColorVis6;
    case ALERT_EPISODE_STATUS.RECOVERING:
      return euiTheme.colors.vis.euiColorVis2;
    case ALERT_EPISODE_STATUS.INACTIVE:
      return euiTheme.colors.vis.euiColorVis0;
    default:
      return euiTheme.colors.lightShade;
  }
};

export const alertTimelineStatusLabel = (status: AlertEpisodeStatus): string => {
  switch (status) {
    case ALERT_EPISODE_STATUS.PENDING:
      return i18n.translate('xpack.alertingV2.alertTimeline.status.pending', {
        defaultMessage: 'Pending',
      });
    case ALERT_EPISODE_STATUS.ACTIVE:
      return i18n.translate('xpack.alertingV2.alertTimeline.status.active', {
        defaultMessage: 'Active',
      });
    case ALERT_EPISODE_STATUS.RECOVERING:
      return i18n.translate('xpack.alertingV2.alertTimeline.status.recovering', {
        defaultMessage: 'Recovering',
      });
    case ALERT_EPISODE_STATUS.INACTIVE:
      return i18n.translate('xpack.alertingV2.alertTimeline.status.inactive', {
        defaultMessage: 'Inactive',
      });
    default:
      return i18n.translate('xpack.alertingV2.alertTimeline.status.unknown', {
        defaultMessage: 'Unknown',
      });
  }
};

export const ALERT_TIMELINE_STATUS_LEGEND_ORDER: readonly AlertEpisodeStatus[] = [
  ALERT_EPISODE_STATUS.PENDING,
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.RECOVERING,
  ALERT_EPISODE_STATUS.INACTIVE,
];
