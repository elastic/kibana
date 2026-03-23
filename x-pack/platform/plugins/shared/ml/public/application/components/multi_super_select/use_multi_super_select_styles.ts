/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mathWithUnits,
  useEuiFontSize,
  useEuiTheme,
  highContrastModeStyles,
  euiCanAnimate,
} from '@elastic/eui';
import { css } from '@emotion/react';

export const useMultiSuperSelectStyles = (isOpen: boolean) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme, highContrastMode } = euiThemeContext;

  const fill = encodeURIComponent(euiTheme.colors.primary);
  const inlineSVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='${fill}' /%3E%3C/svg%3E`;

  const stateUnderlineHeight = highContrastMode
    ? mathWithUnits(euiTheme.border.width.thick, (x) => x * 2)
    : euiTheme.border.width.thick;

  const backgroundUnderline =
    highContrastMode !== 'forced'
      ? 'background-size: 100% 100%'
      : `background-size: 100% ${stateUnderlineHeight}; background-image: url("${inlineSVG})`;

  const fontSize = useEuiFontSize('s').fontSize;

  const focusStyles = `
    --euiFormControlStateColor: ${euiTheme.colors.primary};
    background-color: ${euiTheme.components.forms.backgroundFocused};
    outline: none;
    ${backgroundUnderline};
  `;

  const backgroundGradient = highContrastModeStyles(euiThemeContext, {
    none: `
    background-repeat: no-repeat;
    background-size: 0% 100%;
    background-image: linear-gradient(to top,
        var(--euiFormControlStateColor),
        var(--euiFormControlStateColor) ${stateUnderlineHeight},
        transparent ${stateUnderlineHeight},
        transparent 100%
      );
    `,

    forced: `
    background-repeat: no-repeat;
    background-size: 0% ${stateUnderlineHeight};
    background-position: bottom left;
    background-origin: border-box;
    `,
  });

  const formAnimation = `${euiTheme.animation.fast} ease-in`;

  const backgroundAnimation = `
  ${euiCanAnimate} {
    transition:
      background-image ${formAnimation},
      background-size ${formAnimation},
      background-color ${formAnimation};
  }
`.trim();

  return {
    control: css`
      font-family: ${euiTheme.font.family};
      font-size: ${fontSize};
      color: ${euiTheme.colors.textParagraph};
      ${backgroundGradient};
      ${backgroundAnimation};
      display: block;
      line-height: 32px;
      padding-inline-end: calc(${euiTheme.size.xxxxl} * var(--euiFormControlRightIconsCount, 0));
      color: ${euiTheme.colors.textParagraph};
      font-weight: ${euiTheme.font.weight.regular};
      border: none;
      background-repeat: no-repeat;
      &:focus {
        ${focusStyles}
      }
      ${isOpen ? focusStyles : ''};
      block-size: 100%;
      border-radius: 0;
    `,
  };
};
