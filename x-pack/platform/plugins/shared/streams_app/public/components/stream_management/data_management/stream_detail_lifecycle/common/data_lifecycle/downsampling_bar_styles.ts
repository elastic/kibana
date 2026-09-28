/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useDownsamplingBarStyles = ({
  gridTemplateColumns,
  hasDownsamplingSteps,
  deletePanelColor,
}: {
  gridTemplateColumns: string;
  hasDownsamplingSteps: boolean;
  deletePanelColor: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const containerCss = css`
      height: 40px;
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      border-radius: 8px;
      padding: ${hasDownsamplingSteps ? '4px 2px' : '0'};
      border: none;
    `;

    const gridCss = css`
      grid-template-columns: ${gridTemplateColumns};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
      height: 100%;
    `;

    const emptyFlexItemCss = css`
      grid-column: 1 / -1;
      height: 100%;
      box-sizing: border-box;
    `;

    const emptyPanelCss = css`
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background-image: repeating-linear-gradient(
        -45deg,
        ${euiTheme.colors.backgroundBaseSubdued},
        ${euiTheme.colors.backgroundBaseSubdued} 25%,
        ${euiTheme.colors.backgroundLightText} 25%,
        ${euiTheme.colors.backgroundLightText} 50%,
        ${euiTheme.colors.backgroundBaseSubdued} 50%
      );
      background-size: ${euiTheme.size.xs} ${euiTheme.size.xs};
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const emptyLabelCss = css`
      line-height: ${euiTheme.size.base};
      display: inline-block;
      color: ${euiTheme.colors.disabledText};
    `;

    const segmentFlexItemCss = css`
      display: flex;
      flex-basis: 0;
      min-width: 0;
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
      justify-content: center;
      height: 100%;
    `;

    const slotPanelCss = css`
      height: 100%;
      width: 100%;
    `;

    const deletePanelCss = css`
      ${slotPanelCss};
      background-color: ${deletePanelColor};
      border-radius: ${euiTheme.border.radius.small};
    `;

    const transparentPanelCss = css`
      ${slotPanelCss};
      background-color: transparent;
    `;

    return {
      containerCss,
      gridCss,
      emptyFlexItemCss,
      emptyPanelCss,
      emptyLabelCss,
      segmentFlexItemCss,
      deletePanelCss,
      transparentPanelCss,
    };
  }, [deletePanelColor, euiTheme, gridTemplateColumns, hasDownsamplingSteps]);
};
