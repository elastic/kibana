/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui-theme-common';

/**
 * Isomer's token values for one computed EUI theme, named after the EUI tokens they read.
 *
 * Replace this source when `@elastic/design-tokens` ships (elastic/eui#9595).
 */
type Step = 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

const byStep = (read: (step: Step) => string): Record<Step, string> => ({
  xxs: read('xxs'),
  xs: read('xs'),
  s: read('s'),
  m: read('m'),
  l: read('l'),
  xl: read('xl'),
  xxl: read('xxl'),
});

export const toTokenValues = ({ base, border, colors, font, size }: EuiThemeComputed) => ({
  color: {
    text: {
      paragraph: colors.textParagraph,
      heading: colors.textHeading,
      subdued: colors.textSubdued,
      inverse: colors.textInverse,
      primary: colors.textPrimary,
      accent: colors.textAccent,
      success: colors.textSuccess,
      warning: colors.textWarning,
      risk: colors.textRisk,
      danger: colors.textDanger,
      neutral: colors.textNeutral,
    },
    background: {
      plain: colors.backgroundBasePlain,
      subdued: colors.backgroundBaseSubdued,
      base: {
        primary: colors.backgroundBasePrimary,
        accent: colors.backgroundBaseAccent,
        success: colors.backgroundBaseSuccess,
        warning: colors.backgroundBaseWarning,
        risk: colors.backgroundBaseRisk,
        danger: colors.backgroundBaseDanger,
        neutral: colors.backgroundBaseNeutral,
      },
      filled: {
        primary: colors.backgroundFilledPrimary,
        accent: colors.backgroundFilledAccent,
        success: colors.backgroundFilledSuccess,
        warning: colors.backgroundFilledWarning,
        risk: colors.backgroundFilledRisk,
        danger: colors.backgroundFilledDanger,
        neutral: colors.backgroundFilledNeutral,
      },
    },
    border: {
      plain: colors.borderBasePlain,
      subdued: colors.borderBaseSubdued,
    },
  },
  size: byStep((step) => size[step]),
  font: {
    size: byStep((step) => `${base * font.scale[step]}px`),
    family: {
      sans: font.family,
      code: font.familyCode ?? 'monospace',
    },
    weight: {
      semiBold: String(font.weight.semiBold),
      bold: String(font.weight.bold),
    },
  },
  border: {
    radius: {
      small: String(border.radius.small),
      medium: String(border.radius.medium),
    },
  },
});

export type BorealisTokenValues = ReturnType<typeof toTokenValues>;
