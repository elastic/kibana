/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiFontSizeFromScale, euiLineHeightFromBaseline } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui-theme-common';

const FONT_STEPS = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] as const;
const SIZE_STEPS = ['xxs', 'xs', 's', 'm', 'base', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'] as const;
const FAMILIES = [
  'Primary',
  'Accent',
  'AccentSecondary',
  'Neutral',
  'Success',
  'Warning',
  'Risk',
  'Danger',
  'Assistance',
] as const;
const SEVERITIES = ['unknown', 'neutral', 'success', 'warning', 'risk', 'danger'] as const;
const VIS_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type Family = (typeof FAMILIES)[number];
type VisIndex = (typeof VIS_INDEXES)[number];

const byKey = <K extends string>(keys: readonly K[], read: (key: K) => string) =>
  Object.fromEntries(keys.map((key) => [key, read(key)])) as Record<K, string>;

const uncapitalize = <S extends string>(value: S) =>
  `${value.charAt(0).toLowerCase()}${value.slice(1)}` as Uncapitalize<S>;

const byFamily = (read: (family: Family) => string) =>
  Object.fromEntries(FAMILIES.map((family) => [uncapitalize(family), read(family)])) as Record<
    Uncapitalize<Family>,
    string
  >;

const byVisIndex = <P extends string>(prefix: P, read: (index: VisIndex) => string) =>
  Object.fromEntries(VIS_INDEXES.map((index) => [`${prefix}${index}`, read(index)])) as Record<
    `${P}${VisIndex}`,
    string
  >;

/**
 * Isomer's token values for one computed EUI theme: the subset of `EuiThemeComputed` primitives may style with, named after the EUI tokens they read.
 *
 * Replace this source when `@elastic/design-tokens` ships (elastic/eui#9595).
 */
export const toTokenValues = (theme: EuiThemeComputed) => {
  const { border, colors, font, size } = theme;
  const { severity, vis } = colors;
  return {
    color: {
      text: {
        paragraph: colors.textParagraph,
        heading: colors.textHeading,
        subdued: colors.textSubdued,
        inverse: colors.textInverse,
        ...byFamily((family) => colors[`text${family}`]),
      },
      background: {
        plain: colors.backgroundBasePlain,
        subdued: colors.backgroundBaseSubdued,
        base: byFamily((family) => colors[`backgroundBase${family}`]),
        light: byFamily((family) => colors[`backgroundLight${family}`]),
        filled: byFamily((family) => colors[`backgroundFilled${family}`]),
      },
      border: {
        plain: colors.borderBasePlain,
        subdued: colors.borderBaseSubdued,
        prominent: colors.borderBaseProminent,
        base: byFamily((family) => colors[`borderBase${family}`]),
        strong: byFamily((family) => colors[`borderStrong${family}`]),
      },
      vis: {
        ...byVisIndex('series', (index) => vis[`euiColorVis${index}`]),
        ...byVisIndex('text', (index) => vis[`euiColorVisText${index}`]),
        ...byVisIndex('behindText', (index) => vis[`euiColorVisBehindText${index}`]),
      },
      severity: byKey(SEVERITIES, (level) => severity[level]),
    },
    size: byKey(SIZE_STEPS, (step) => size[step]),
    font: {
      size: byKey(FONT_STEPS, (step) => euiFontSizeFromScale(step, theme, { unit: 'px' })),
      lineHeight: byKey(FONT_STEPS, (step) =>
        euiLineHeightFromBaseline(step, theme, { unit: 'px' })
      ),
      family: {
        sans: font.family,
        code: font.familyCode ?? 'monospace',
      },
      weight: {
        regular: String(font.weight.regular),
        medium: String(font.weight.medium),
        semiBold: String(font.weight.semiBold),
        bold: String(font.weight.bold),
      },
    },
    border: {
      width: {
        thin: String(border.width.thin),
        thick: String(border.width.thick),
      },
      radius: {
        inline: String(border.radius.inline),
        control: String(border.radius.control),
        panel: String(border.radius.panel),
        frame: String(border.radius.frame),
      },
    },
  };
};

export type BorealisTokenValues = ReturnType<typeof toTokenValues>;
