/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { EuiThemeComputed, useEuiFontSize } from '@elastic/eui';
import { withAttrs } from '../../../utils/theme_utils/with_attrs';
import { TextScale } from '../../../../common/log_text_scale';

export type WrapMode = 'none' | 'pre-wrapped' | 'long';

const getFontSize = (textscale: TextScale) => {
  switch (textscale) {
    case 'large':
      return 'm';
    case 'medium':
      return 's';
    case 'small':
      return 'xs';
    default:
      return 's';
  }
};

export const useMonospaceTextStyle = (scale: TextScale, euiTheme: EuiThemeComputed) => css`
  font-family: ${euiTheme.font.familyCode};
  font-size: ${useEuiFontSize(getFontSize(scale))};
  line-height: ${euiTheme.font.lineHeightMultiplier};
`;

export const hoveredContentStyle = (euiTheme: EuiThemeComputed) => css`
  background-color: ${euiTheme.focus.backgroundColor};
`;

export const highlightedContentStyle = (euiTheme: EuiThemeComputed) => css`
  background-color: ${euiTheme.colors.highlight};
`;

export const longWrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

export const preWrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

export const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: nowrap;
`;

interface CharacterDimensions {
  height: number;
  width: number;
}

export const useMeasuredCharacterDimensions = (scale: TextScale) => {
  const [dimensions, setDimensions] = useState<CharacterDimensions>({
    height: 0,
    width: 0,
  });
  const measureElement = useCallback((element: Element | null) => {
    if (!element) {
      return;
    }

    const boundingBox = element.getBoundingClientRect();

    setDimensions({
      height: boundingBox.height,
      width: boundingBox.width,
    });
  }, []);

  const CharacterDimensionsProbe = useMemo(
    () => () =>
      (
        <MonospaceCharacterDimensionsProbe scale={scale} ref={measureElement}>
          X
        </MonospaceCharacterDimensionsProbe>
      ),
    [measureElement, scale]
  );

  return {
    CharacterDimensionsProbe,
    dimensions,
  };
};

interface MonospaceCharacterDimensionsProbe {
  scale: TextScale;
}

const MonospaceCharacterDimensionsProbe = withAttrs(
  styled.div<MonospaceCharacterDimensionsProbe>`
    visibility: hidden;
    position: absolute;
    height: auto;
    width: auto;
    padding: 0;
    margin: 0;

    ${(props) => useMonospaceTextStyle(props.scale, props.theme.euiTheme)};
  `,
  () => ({
    'aria-hidden': true,
  })
);
