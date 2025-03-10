/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useCurrentEuiThemeVars } from '@kbn/ml-kibana-theme';
import { ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils';
import { useMlKibana } from '../../contexts/kibana';

export const useInfluencersListStyles = () => {
  const {
    services: { theme },
  } = useMlKibana();
  const { euiTheme } = useCurrentEuiThemeVars(theme);

  return {
    influencersList: css({
      lineHeight: 1.45,
    }),
    fieldLabel: css({
      fontSize: euiTheme.euiFontSizeXS,
      textAlign: 'left',
      maxHeight: euiTheme.euiFontSizeM,
      maxWidth: 'calc(100% - 102px)',
    }),
    progress: css({
      display: 'inline-block',
      width: 'calc(100% - 34px)',
      height: '22px',
      minWidth: '70px',
      marginBottom: 0,
      color: euiTheme.euiColorDarkShade,
      backgroundColor: 'transparent',
    }),
    progressBarHolder: css({
      width: `calc(100% - 28px)`,
    }),
    progressBar: (severity: string, barScore: number) =>
      css({
        height: `calc(${euiTheme.euiSizeXS} / 2)`,
        float: 'left',
        marginTop: euiTheme.euiSizeM,
        textAlign: 'right',
        lineHeight: '18px',
        display: 'inline-block',
        transition: 'none',
        width: `${barScore}%`,
        backgroundColor:
          severity === 'critical'
            ? ML_SEVERITY_COLORS.CRITICAL
            : severity === 'major'
            ? ML_SEVERITY_COLORS.MAJOR
            : severity === 'minor'
            ? ML_SEVERITY_COLORS.MINOR
            : ML_SEVERITY_COLORS.WARNING,
      }),
    scoreLabel: (severity: string) =>
      css({
        textAlign: 'center',
        lineHeight: '14px',
        whiteSpace: 'nowrap',
        fontSize: euiTheme.euiFontSizeXS,
        marginLeft: euiTheme.euiSizeXS,
        display: 'inline',
        borderColor:
          severity === 'critical'
            ? ML_SEVERITY_COLORS.CRITICAL
            : severity === 'major'
            ? ML_SEVERITY_COLORS.MAJOR
            : severity === 'minor'
            ? ML_SEVERITY_COLORS.MINOR
            : ML_SEVERITY_COLORS.WARNING,
      }),
    totalScoreLabel: css({
      width: euiTheme.euiSizeXL,
      verticalAlign: 'top',
      textAlign: 'center',
      color: euiTheme.euiColorDarkShade,
      fontSize: '11px',
      lineHeight: '14px',
      borderRadius: euiTheme.euiBorderRadius,
      padding: `calc(${euiTheme.euiSizeXS} / 2)`,
      display: 'inline-block',
      border: euiTheme.euiBorderThin,
    }),
  };
};
