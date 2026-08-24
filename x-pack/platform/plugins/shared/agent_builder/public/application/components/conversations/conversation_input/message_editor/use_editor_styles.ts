/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import { euiCanAnimate, euiTextTruncate, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import {
  IMAGE_PLACEHOLDER_ATTRIBUTE,
  IMAGE_PLACEHOLDER_ICON_ATTRIBUTE,
  IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE,
} from './image_placeholder';

// Same timing and values as the indeterminate bar in UploadingImagePill (attachment_pills_row.tsx).
// Replicated here (rather than extracted) because the two live in separate module boundaries —
// attachment_pills_row is a React component file, this is a hook file; a third shared file
// would add coupling without other benefit.
const indeterminateProgressSweep = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

/** Returns CSS for the image placeholder chip inside the contenteditable editor. */
export const useImagePlaceholderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] {
      display: inline-flex;
      /* The label is the only baseline-aligned item, so it becomes the chip's
         baseline source and lines up with the surrounding editor text. */
      align-items: baseline;
      gap: ${euiTheme.size.xs};
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      margin: 0 ${euiTheme.size.xs};
      max-width: 24ch;
      cursor: default;
      user-select: all;
      vertical-align: baseline;
      line-height: inherit;
      white-space: nowrap;
      transition: box-shadow ${euiTheme.animation.fast};
      position: relative;
      overflow: hidden;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > svg {
      flex-shrink: 0;
      /* Opt the icon out of baseline alignment so it stays centered and the
         label remains the chip's baseline source. */
      align-self: center;
      width: ${euiTheme.size.base};
      height: ${euiTheme.size.base};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > [${IMAGE_PLACEHOLDER_ICON_ATTRIBUTE}] {
      display: inline-flex;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > [${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}] {
      display: none;
      cursor: pointer;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover > [${IMAGE_PLACEHOLDER_ICON_ATTRIBUTE}] {
      display: none;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover > [${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}] {
      display: inline-flex;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}]:hover > .image-placeholder-label {
      text-decoration: underline;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}] > .image-placeholder-label {
      min-width: 0;
      ${euiTextTruncate('100%')}
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}].image-placeholder-highlighted {
      box-shadow: inset 0 0 0 2px ${euiTheme.colors.borderStrongPrimary};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true'] {
      width: calc(${euiTheme.size.l} * 3);
      height: ${euiTheme.size.l};
      padding: 0;
      gap: 0;
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true'] > * {
      visibility: hidden;
    }
    [${IMAGE_PLACEHOLDER_ATTRIBUTE}][data-uploading='true']::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      height: ${euiTheme.border.width.thick};
      width: 40%;
      background: ${euiTheme.colors.borderStrongPrimary};
      ${euiCanAnimate} {
        animation: ${indeterminateProgressSweep} 1.4s ease-in-out infinite;
      }
    }
  `;
};

/** Returns the font size CSS for the editor (matches the `s` variant used by siblings). */
export const useEditorFontStyles = () => {
  return css`
    ${useEuiFontSize('s')}
  `;
};
