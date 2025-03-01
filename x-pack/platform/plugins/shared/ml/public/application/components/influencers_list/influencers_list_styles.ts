/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

import { ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils';

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
    progress: css({
      display: 'inline-block',
      width: 'calc(100% - 34px)',
      height: '22px',
      minWidth: '70px',
      marginBottom: 0,
      color: euiTheme.colors.darkShade,
      backgroundColor: 'transparent',
    }),
    progressBarHolder: css({
      width: `calc(100% - 28px)`,
    }),
    progressBar: (severity: string, barScore: number) =>
      css({
        height: `calc(${euiTheme.size.xs} / 2)`,
        float: 'left',
        marginTop: euiTheme.size.m,
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
        fontSize: euiFontSizeXS,
        marginLeft: euiTheme.size.xs,
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
      width: euiTheme.size.xl,
      verticalAlign: 'top',
      textAlign: 'center',
      color: euiTheme.colors.darkShade,
      fontSize: '11px',
      lineHeight: '14px',
      borderRadius: euiTheme.border.radius.small,
      padding: `calc(${euiTheme.size.xs} / 2)`,
      display: 'inline-block',
      border: euiTheme.border.thin,
    }),
  };
};
