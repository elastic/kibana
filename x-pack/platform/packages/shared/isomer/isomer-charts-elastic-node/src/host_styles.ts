/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The page Elastic Charts expects to sit in. In Kibana it inherits EUI's global styles: Eric Meyer's reset and the
// body's font, size and line height on `html`. Its legends, metrics and tooltips are DOM, laid out by those styles,
// so without them text takes user-agent margins and `normal` line heights that clip descenders.

import { resetStyles } from '@elastic/eui/lib/global_styling/reset/reset';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';

const ROOT = '.echChart';

/** Each rule's selectors under the chart, at the specificity EUI's unscoped global reset has. */
export const scopeCss = (css: string, root: string): string =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectors: string, body: string) => {
      const scoped = selectors
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean)
        .map((selector) => `:where(${root}) ${selector}`)
        .join(',');
      return `${scoped}{${body.trim()}}`;
    })
    .replace(/\s*\n\s*/g, '');

interface BorealisFont {
  family: string;
  featureSettings: string;
  scale: Record<string, number>;
  weight: Record<string, number>;
  body: { scale: string; weight: string };
}

/** EUI's `html` font reset (`global_styles`), in pixels: the body scale of the 16-pixel base, and a 16-pixel line. */
export const euiBodyFont = (): string => {
  const { base } = EuiThemeBorealis.root as unknown as { base: number };
  const font = EuiThemeBorealis.root.font as unknown as BorealisFont;
  const size = font.scale[font.body.scale]! * base;
  return [
    `font-family:${font.family}`,
    `font-size:${size}px`,
    `line-height:${base / size}`,
    `font-weight:${font.weight[font.body.weight]}`,
    'font-kerning:normal',
  ].join(';');
};

/** EUI's global reset and body font, as Kibana's page gives every chart. */
export const euiHostStyles = (): string =>
  `:where(${ROOT}){${euiBodyFont()}}${scopeCss(resetStyles, ROOT)}`;
