/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useTimerangeBarStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    ganttBar: css({
      backgroundColor: euiTheme.colors.vis.euiColorVis2,
      height: euiTheme.size.m,
      borderRadius: '2px',
    }),
    ganttBarBackEdge: css({
      height: euiTheme.size.base,
      borderLeft: `1px solid ${euiTheme.colors.borderBasePlain}`,
      borderRight: `1px solid ${euiTheme.colors.borderBasePlain}`,
      marginBottom: '-14px',
      paddingTop: euiTheme.size.s,
    }),
    ganttBarDashed: css({
      height: '1px',
      borderTop: `1px dashed ${euiTheme.colors.borderBasePlain}`,
    }),
    ganttBarRunning: css({
      backgroundImage: `linear-gradient(45deg,
        rgba(255, 255, 255, .15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, .15) 50%,
        rgba(255, 255, 255, .15) 75%,
        transparent 75%,
        transparent)`,
      backgroundSize: `${euiTheme.size.xxl} ${euiTheme.size.xxl}`,
      animation: 'progress-bar-stripes 2s linear infinite',
    }),
  };
};
