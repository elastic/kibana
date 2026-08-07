/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { IMAGE_PLACEHOLDER_ATTRIBUTE } from './image_placeholder';

export const useImagePlaceholderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] {
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      cursor: default;
      user-select: all;
      vertical-align: middle;
      line-height: inherit;
      transition: box-shadow ${euiTheme.animation.fast};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}].image-placeholder-highlighted {
      box-shadow: 0 0 0 2px ${euiTheme.colors.borderStrongPrimary};
    }
  `;
};

export const useEditorFontStyles = () => {
  return css`
    ${useEuiFontSize('m')}
  `;
};
