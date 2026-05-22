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
      background-color: ${hasDownsamplingSteps
        ? euiTheme.colors.backgroundBaseSubdued
        : 'transparent'};
      border-radius: ${hasDownsamplingSteps ? '8px' : '0'};
      padding: ${hasDownsamplingSteps ? '4px 2px' : '0'};
      border: none;
    `;

    const gridCss = css`
      grid-template-columns: ${gridTemplateColumns};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
    `;

    const emptyFlexItemCss = css`
      grid-column: 1 / -1;
      padding-block: ${euiTheme.size.xxs};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
    `;

    const emptyPanelCss = css`
      padding-block: ${euiTheme.size.m};
      position: relative;
      box-sizing: border-box;
      width: 100%;
      border-radius: 8px;
      background-image: repeating-linear-gradient(
        -45deg,
        ${euiTheme.colors.backgroundBaseSubdued},
        ${euiTheme.colors.backgroundBaseSubdued} 25%,
        ${euiTheme.colors.backgroundBasePlain} 25%,
        ${euiTheme.colors.backgroundBasePlain} 50%,
        ${euiTheme.colors.backgroundBaseSubdued} 50%
      );
      background-size: ${euiTheme.size.xs} ${euiTheme.size.xs};
      text-align: center;
    `;

    const emptyLabelCss = css`
      line-height: ${euiTheme.size.base};
      display: inline-block;
    `;

    const segmentFlexItemCss = css`
      display: flex;
      flex-basis: 0;
      min-width: 0;
      padding-block: ${euiTheme.size.xxs};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
      justify-content: center;
    `;

    const slotPanelCss = css`
      min-height: 30px;
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
