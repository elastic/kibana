/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { css } from '@emotion/react';

export const useExplorerChartTooltipStyles = () => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;

  return useMemo(
    () => ({
      tooltip: css({
        maxWidth: '384px',
      }),
      descriptionList: css({
        display: 'grid',
        gridTemplateColumns: 'max-content auto',
        '& > *': {
          marginTop: euiTheme.size.xs,
        },
      }),
      title: css({
        color: euiTheme.colors.ghost,
        fontSize: euiFontSizeXS,
        fontWeight: 'normal',
        whiteSpace: 'nowrap',
        gridColumnStart: 1,
      }),
      description: css({
        color: euiTheme.colors.ghost,
        fontSize: euiFontSizeXS,
        fontWeight: 'bold',
        paddingLeft: euiTheme.size.s,
        maxWidth: '256px',
        gridColumnStart: 2,
      }),
      chartDescription: css({
        fontSize: euiFontSizeXS,
        fontStyle: 'italic',
      }),
    }),
    [euiFontSizeXS, euiTheme]
  );
};
