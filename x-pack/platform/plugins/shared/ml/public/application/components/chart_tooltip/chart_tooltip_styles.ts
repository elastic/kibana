/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { mathWithUnits, transparentize, useEuiFontSize, useEuiTheme } from '@elastic/eui';
// @ts-expect-error style types not defined
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';

export const useChartTooltipStyles = () => {
  const theme = useEuiTheme();
  const { euiTheme } = theme;
  const euiStyles = euiToolTipStyles(theme);
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;

  return {
    mlChartTooltip: css([
      euiStyles.euiToolTip,
      {
        fontSize: euiFontSizeXS,
        padding: 0,
        transition: `opacity ${euiTheme.animation.normal}`,
        pointerEvents: 'none',
        userSelect: 'none',
        maxWidth: '512px',
        position: 'relative',
      },
    ]),
    mlChartTooltipList: css({
      margin: euiTheme.size.xs,
      paddingBottom: euiTheme.size.xs,
    }),
    mlChartTooltipHeader: css({
      fontWeight: euiTheme.font.weight.bold,
      padding: `${euiTheme.size.xs} ${mathWithUnits(euiTheme.size.xs, (x) => x * 2)}`,
      marginBottom: euiTheme.size.xs,
      borderBottom: `1px solid ${transparentize(euiTheme.border.color, 0.8)}`,
    }),
    mlChartTooltipItem: css({
      display: 'flex',
      padding: '3px',
      boxSizing: 'border-box',
      borderLeft: `${euiTheme.size.xs} solid transparent`,
    }),
    mlChartTooltipLabel: css({
      minWidth: '1px',
    }),
    mlChartTooltipValue: css({
      fontWeight: euiTheme.font.weight.bold,
      textAlign: 'right',
      fontFeatureSettings: 'tnum',
      marginLeft: '8px',
    }),
  };
};
