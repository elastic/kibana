/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiTextTruncate, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import {
  IMAGE_PLACEHOLDER_ATTRIBUTE,
  IMAGE_PLACEHOLDER_ICON_ATTRIBUTE,
  IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE,
} from './image_placeholder';
import {
  imageUploadProgressFillStyles,
  imageUploadProgressTrackColorStyles,
} from '../image_upload_styles';

/** Returns CSS for the image placeholder chip inside the contenteditable editor. */
export const useImagePlaceholderStyles = () => {
  const { euiTheme } = useEuiTheme();
  const xsFontStyles = useEuiFontSize('m');
  return css`
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] {
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundBasePrimary};
      border-radius: ${euiTheme.size.xs};
      margin: 0 ${euiTheme.size.xs};
      max-width: 24ch;
      padding: 0 ${euiTheme.size.s} 0 ${euiTheme.size.xs};
      cursor: default;
      user-select: all;
      vertical-align: baseline;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
      height: 20px;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > [${IMAGE_PLACEHOLDER_ICON_ATTRIBUTE}] {
      display: inline-flex;
      flex-shrink: 0;
      align-self: center;
      width: ${euiTheme.size.m};
      height: ${euiTheme.size.m};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > [${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}] {
      display: none;
      cursor: pointer;
      flex-shrink: 0;
      align-self: center;
      width: ${euiTheme.size.m};
      height: ${euiTheme.size.m};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover > [${IMAGE_PLACEHOLDER_ICON_ATTRIBUTE}] {
      display: none;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover > [${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}] {
      display: inline-flex;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > .image-placeholder-label {
      min-width: 0;
      ${euiTextTruncate('100%')}
      color: ${euiTheme.colors.textPrimary};
      ${xsFontStyles}
      font-weight: ${euiTheme.font.weight.regular};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > .image-placeholder-progress-track {
      display: none;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true'] {
      width: calc(${euiTheme.size.l} * 3);
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true'] > * {
      visibility: hidden;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true'] > .image-placeholder-progress-track {
      display: block;
      visibility: visible;
      position: absolute;
      top: 50%;
      left: ${euiTheme.size.xs};
      right: ${euiTheme.size.xs};
      height: ${euiTheme.border.width.thick};
      transform: translateY(-50%);
      ${imageUploadProgressTrackColorStyles(euiTheme)}
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true']
      > .image-placeholder-progress-track
      > .image-placeholder-progress-fill {
      ${imageUploadProgressFillStyles(euiTheme)}
    }
  `;
};
