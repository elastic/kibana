/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const ilmTimelineBarHeight = euiTheme.size.s;
  const isBorealis = euiTheme.themeName === 'EUI_THEME_BOREALIS';

  const timelineIconColors = {
    hot: isBorealis ? euiTheme.colors.vis.euiColorVis6 : euiTheme.colors.vis.euiColorVis9,
    warm: isBorealis ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.vis.euiColorVis5,
    cold: isBorealis ? euiTheme.colors.vis.euiColorVis2 : euiTheme.colors.vis.euiColorVis1,
    frozen: euiTheme.colors.vis.euiColorVis4,
  };

  return {
    container: css`
      overflow: hidden;
      width: 100%;
    `,
    /*
     * Let the delete icon sit on the same line as the phase color bars
     */
    phasesContainer: css`
      display: inline-block;
      width: 100%;
      margin-top: ${euiTheme.size.s};
    `,
    /*
     * Let the phase color bars sit horizontally
     */
    phase: css`
      display: inline-block;
      padding-left: ${euiTheme.size.s};
      padding-right: ${euiTheme.size.s};

      &:first-child {
        padding-left: 0;
        padding-right: ${euiTheme.size.s};
      }

      &:last-child {
        padding-left: ${euiTheme.size.s};
        padding-right: 0;
      }

      &:only-child {
        padding-left: 0;
        padding-right: 0;
      }
    `,
    /*
     * Create a bit of space between the timeline and the delete icon
     */
    deleteIconContainer: css`
      padding: ${euiTheme.size.m};
      margin-left: ${euiTheme.size.m};
      background-color: ${euiTheme.colors.lightestShade};
      color: ${euiTheme.colors.darkShade};
      border-radius: 50%;
    `,
    colorBar: css`
      display: inline-block;
      height: ${ilmTimelineBarHeight};
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
      border-radius: calc(${ilmTimelineBarHeight} / 2);
      width: 100%;
    `,
    hotColorBar: css`
      display: inline-block;
      height: ${ilmTimelineBarHeight};
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
      border-radius: calc(${ilmTimelineBarHeight} / 2);
      width: 100%;
      background-color: ${timelineIconColors.hot};
    `,
    warmColorBar: css`
      display: inline-block;
      height: ${ilmTimelineBarHeight};
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
      border-radius: calc(${ilmTimelineBarHeight} / 2);
      width: 100%;
      background-color: ${timelineIconColors.warm};
    `,
    coldColorBar: css`
      display: inline-block;
      height: ${ilmTimelineBarHeight};
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
      border-radius: calc(${ilmTimelineBarHeight} / 2);
      width: 100%;
      background-color: ${timelineIconColors.cold};
    `,
    frozenColorBar: css`
      display: inline-block;
      height: ${ilmTimelineBarHeight};
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.xs};
      border-radius: calc(${ilmTimelineBarHeight} / 2);
      width: 100%;
      background-color: ${timelineIconColors.frozen};
    `,
    hotPhase: css`
      width: var(--ilm-timeline-hot-phase-width);
    `,
    warmPhase: css`
      width: var(--ilm-timeline-warm-phase-width);
    `,
    coldPhase: css`
      width: var(--ilm-timeline-cold-phase-width);
    `,
    frozenPhase: css`
      width: var(--ilm-timeline-frozen-phase-width);
    `,
  };
};
