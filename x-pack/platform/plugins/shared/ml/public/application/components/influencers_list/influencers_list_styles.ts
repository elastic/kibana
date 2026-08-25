/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

import {
  getThemeResolvedSeverityColor,
  ML_ANOMALY_THRESHOLD,
  type MlSeverityType,
} from '@kbn/ml-anomaly-utils';

export const useInfluencersListStyles = () => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;
  const euiFontSizeM = useEuiFontSize('m').fontSize;

  return {
    influencersList: css({
      lineHeight: 1.45,
    }),
    fieldLabel: css({
      fontSize: euiFontSizeXS,
      textAlign: 'left',
      maxHeight: euiFontSizeM,
      maxWidth: 'calc(100% - 102px)',
    }),
    progressBar: css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      '&::-webkit-progress-bar': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      },
    }),
    progressColor: (severity: MlSeverityType) =>
      severity.id === 'critical'
        ? getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme)
        : severity.id === 'major'
        ? getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme)
        : severity.id === 'minor'
        ? getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme)
        : severity.id === 'warning'
        ? getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme)
        : severity.id === 'low'
        ? getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme)
        : euiTheme.colors.severity.unknown,
    influencerBadgeBackgroundColor: (severity: MlSeverityType) =>
      severity.id === 'critical'
        ? euiTheme.colors.backgroundLightDanger
        : severity.id === 'major'
        ? euiTheme.colors.backgroundLightRisk
        : severity.id === 'minor'
        ? euiTheme.colors.backgroundLightWarning
        : severity.id === 'warning' || severity.id === 'low'
        ? euiTheme.colors.backgroundLightNeutral
        : euiTheme.colors.backgroundLightPrimary,
    influencerBadgeTextColor: (severity: MlSeverityType) =>
      css({
        color:
          severity.id === 'critical'
            ? euiTheme.colors.textDanger
            : severity.id === 'major'
            ? euiTheme.colors.textRisk
            : severity.id === 'minor'
            ? euiTheme.colors.textWarning
            : severity.id === 'warning' || severity.id === 'low'
            ? euiTheme.colors.textNeutral
            : euiTheme.colors.textSubdued,
      }),
  };
};
