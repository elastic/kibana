/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind, rgbToHex, type EuiThemeComputed } from '@elastic/eui';

const NORMALIZER_ATTRIBUTE = 'data-cc-eui-normalizer';
const NORMALIZER_STYLE_PATTERN =
  /<style\b[^>]*\bdata-cc-eui-normalizer(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/style>\s*/gi;
const COLOR_LITERAL_PATTERN = /#[\da-f]{3,8}\b|rgba?\([^)]+\)/gi;
const CSS_DECLARATION_PATTERN = /(^|[;{]\s*)([-\w]+)\s*:\s*([^;}]+)/gim;
const CHART_SELECTOR_PATTERN = /\b(chart|plot|graph|series|bar|line|area|arc|slice|axis|grid)\b/i;
const SPACING_PROPERTY_PATTERN =
  /^(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$/;
const SPACING_VALUE_PATTERN = /(-?\d*\.?\d+)(px|rem)\b/gi;

const NORMALIZER_STYLES = `
/* Kibana alignment POC. Re-applying the utility replaces this block. */
body{font-family:var(--cc-font-family)!important;color:var(--cc-color-text)!important;font-size:var(--cc-font-size-body)!important;line-height:var(--cc-line-height-body)!important}
h1,h2,h3,h4,h5,h6{color:var(--cc-color-heading)!important;font-weight:var(--cc-font-weight-bold)!important;margin-block-start:0!important;margin-block-end:var(--cc-space-m)!important}
h1{font-size:var(--cc-font-size-h1)!important;line-height:var(--cc-line-height-h1)!important}
h2{font-size:var(--cc-font-size-h2)!important;line-height:var(--cc-line-height-h2)!important}
h3{font-size:var(--cc-font-size-h3)!important;line-height:var(--cc-line-height-h3)!important}
h4{font-size:var(--cc-font-size-h4)!important;line-height:var(--cc-line-height-h4)!important}
h5{font-size:var(--cc-font-size-h5)!important;line-height:var(--cc-line-height-h5)!important}
h6{font-size:var(--cc-font-size-label)!important;line-height:var(--cc-line-height-label)!important}
p{margin-block-start:0!important;margin-block-end:var(--cc-space-m)!important}
small,label,.label,[class*="label"],[class*="secondary"],[class*="subdued"]{color:var(--cc-color-subdued)!important;font-size:var(--cc-font-size-label)!important;line-height:var(--cc-line-height-label)!important}
table{width:100%!important;border-collapse:collapse!important;border-spacing:0!important;font-size:var(--cc-font-size-body)!important}
th{color:var(--cc-color-heading)!important;font-weight:var(--cc-font-weight-bold)!important;text-align:start!important}
th,td{padding:var(--cc-space-s) var(--cc-space-m)!important;border-bottom:var(--cc-border-width) solid var(--cc-color-border)!important}
button,input,select,textarea{font-family:var(--cc-font-family)!important;font-size:var(--cc-font-size-body)!important;border:var(--cc-border-width) solid var(--cc-color-border)!important;border-radius:var(--cc-radius-s)!important}
button{min-height:32px!important;padding:var(--cc-space-s) var(--cc-space-m)!important;background-color:transparent!important;color:var(--cc-color-primary)!important;font-weight:var(--cc-font-weight-bold)!important}
input,select,textarea{padding:var(--cc-space-s) var(--cc-space-m)!important;background-color:var(--cc-color-background)!important;color:var(--cc-color-text)!important}
.card,[class*="card"],.panel,[class*="panel"]{background-color:var(--cc-color-surface)!important;border:var(--cc-border-width) solid var(--cc-color-border)!important;border-radius:var(--cc-radius)!important}
.badge,[class*="badge"],.pill,[class*="pill"],.tag,[class*="tag"]{border-radius:var(--cc-radius-s)!important;padding:var(--cc-space-xs) var(--cc-space-s)!important;font-size:var(--cc-font-size-label)!important;font-weight:var(--cc-font-weight-bold)!important}
svg text,svg tspan{font-family:var(--cc-font-family)!important;stroke:none!important}
svg text:not([class*="title"]),svg tspan{font-size:var(--cc-chart-tick-font-size)!important;fill:var(--cc-chart-label-color)!important}
svg text[class*="title"]{font-size:var(--cc-chart-axis-title-font-size)!important;fill:var(--cc-chart-axis-title-color)!important}
svg :is(line,path,polyline)[class*="grid"]{stroke:var(--cc-chart-grid-color)!important;stroke-width:var(--cc-chart-grid-width)!important}
svg :is(line,path,polyline)[class*="axis"]{stroke:var(--cc-chart-axis-line-color)!important;stroke-width:var(--cc-chart-axis-line-width)!important}
svg :is(path,polyline)[class*="line"]:not([class*="grid"]):not([class*="axis"]){fill:none!important;stroke-width:var(--cc-chart-line-width)!important;stroke-linecap:round!important;stroke-linejoin:round!important}
svg :is(path,polygon)[class*="area"]:not([fill^="url("]){opacity:var(--cc-chart-area-opacity)!important}
svg circle[class*="point"],svg circle[class*="marker"],svg circle[class*="dot"]{r:var(--cc-chart-point-radius)!important;stroke-width:var(--cc-chart-point-stroke-width)!important}
svg :is(rect,path)[class*="bar"],svg :is(rect,path)[class*="column"],[class~="bar"],[class*="bar-fill"],[class*="bar-inner"]{rx:var(--cc-chart-bar-radius)!important;ry:var(--cc-chart-bar-radius)!important;border-radius:var(--cc-chart-bar-radius)!important;opacity:var(--cc-chart-bar-opacity)!important;border:none!important;stroke:none!important}
/* A rounded track with overflow:hidden clips its fill back into a pill, so it has to square too. */
[class*="bar-track"],[class*="bar-container"],[class*="bar-wrapper"]{border-radius:var(--cc-chart-bar-radius)!important}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

const normalizeColor = (value: string): string | undefined => {
  const trimmed = value.trim().toLowerCase();
  if (/^#[\da-f]{3,8}$/.test(trimmed)) {
    if (trimmed.length === 4) {
      return `#${trimmed
        .slice(1)
        .split('')
        .map((character) => character.repeat(2))
        .join('')}`;
    }
    if (trimmed.length === 7) return trimmed;
    return undefined;
  }
  if (!trimmed.startsWith('rgb') || trimmed.startsWith('rgba')) return undefined;
  try {
    return rgbToHex(trimmed).toLowerCase();
  } catch {
    return undefined;
  }
};

const buildColorMaps = (euiTheme: EuiThemeComputed) => {
  const exact = new Map<string, string>();
  const chart = new Map<string, string>();
  const addExact = (value: string | undefined, variable: string) => {
    if (!value) return;
    const normalized = normalizeColor(value);
    if (normalized) exact.set(normalized, `var(${variable})`);
  };

  addExact(euiTheme.colors.textParagraph, '--cc-color-text');
  addExact(euiTheme.colors.textHeading, '--cc-color-heading');
  addExact(euiTheme.colors.textSubdued, '--cc-color-subdued');
  addExact(euiTheme.colors.emptyShade, '--cc-color-surface');
  addExact(euiTheme.colors.lightestShade, '--cc-color-surface');
  addExact(euiTheme.colors.primary, '--cc-color-primary');
  addExact(euiTheme.colors.accentSecondary, '--cc-color-accent');
  addExact(euiTheme.colors.accent, '--cc-color-accent-2');
  addExact(euiTheme.colors.warning, '--cc-color-warning');
  addExact(euiTheme.colors.danger, '--cc-color-danger');
  addExact(euiTheme.colors.borderBasePlain, '--cc-color-border');
  addExact(euiTheme.colors.borderBaseSubdued, '--cc-color-border');

  euiPaletteColorBlind().forEach((color, index) => {
    const normalized = normalizeColor(color);
    if (normalized) chart.set(normalized, `var(--cc-vis-${index})`);
  });

  return { exact, chart };
};

const replaceColors = (
  value: string,
  exactColors: ReadonlyMap<string, string>,
  chartColors: ReadonlyMap<string, string>,
  isChartContext: boolean
) =>
  value.replace(COLOR_LITERAL_PATTERN, (color) => {
    const normalized = normalizeColor(color);
    if (!normalized) return color;
    return (
      (isChartContext ? chartColors.get(normalized) : undefined) ??
      exactColors.get(normalized) ??
      chartColors.get(normalized) ??
      color
    );
  });

const snapSpacing = (value: string) => {
  const spacing = [
    { pixels: 4, variable: '--cc-space-xs' },
    { pixels: 8, variable: '--cc-space-s' },
    { pixels: 12, variable: '--cc-space-m' },
    { pixels: 16, variable: '--cc-space-l' },
    { pixels: 24, variable: '--cc-space-xl' },
  ];

  return value.replace(SPACING_VALUE_PATTERN, (match, amount: string, unit: string) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return match;
    const pixels = unit.toLowerCase() === 'rem' ? numericAmount * 16 : numericAmount;
    if (pixels > 32) return match;
    const closest = spacing.reduce((best, candidate) =>
      Math.abs(candidate.pixels - pixels) < Math.abs(best.pixels - pixels) ? candidate : best
    );
    return `var(${closest.variable})`;
  });
};

const rewriteCss = (
  cssText: string,
  exactColors: ReadonlyMap<string, string>,
  chartColors: ReadonlyMap<string, string>
) =>
  cssText.replace(
    CSS_DECLARATION_PATTERN,
    (declaration, prefix: string, property: string, rawValue: string, offset: number) => {
      const normalizedProperty = property.toLowerCase();
      const selectorContext = cssText.slice(Math.max(0, offset - 160), offset);
      const isChartContext = CHART_SELECTOR_PATTERN.test(selectorContext);
      let value = replaceColors(rawValue, exactColors, chartColors, isChartContext);

      if (normalizedProperty === 'font-family') value = 'var(--cc-font-family)';
      // Percentage radii describe circles and ellipses, such as avatars and numbered badges.
      // Snapping those to a pixel token would square them off.
      if (normalizedProperty === 'border-radius') {
        value = value.includes('%') ? value : 'var(--cc-radius)';
      }
      if (normalizedProperty === 'box-shadow' || normalizedProperty === 'text-shadow') {
        value = 'none';
      }
      if (value.includes('gradient(')) {
        value = normalizedProperty === 'background' ? 'var(--cc-color-surface)' : 'none';
      }
      if (SPACING_PROPERTY_PATTERN.test(normalizedProperty)) value = snapSpacing(value);

      return `${prefix}${property}:${value}`;
    }
  );

/**
 * Rewrites recognized values to Custom Content theme variables and appends a deterministic
 * Kibana-aligned style layer. Unknown values are preserved rather than guessed.
 */
export const normalizeCustomContentTemplate = (
  template: string,
  euiTheme: EuiThemeComputed
): string => {
  const withoutPreviousNormalizer = template.replace(NORMALIZER_STYLE_PATTERN, '').trimEnd();
  const { exact, chart } = buildColorMaps(euiTheme);

  const withRewrittenStyles = withoutPreviousNormalizer
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_match, open, styles, close) => {
      return `${open}${rewriteCss(styles, exact, chart)}${close}`;
    })
    .replace(
      /(\sstyle\s*=\s*)(["'])(.*?)\2/gi,
      (_match, prefix, quote, styles) =>
        `${prefix}${quote}${rewriteCss(styles, exact, chart)}${quote}`
    )
    .replace(
      /(\s(?:fill|stroke|stop-color)\s*=\s*)(["'])(#[\da-f]{3,8}|rgb\([^)]+\))\2/gi,
      (_match, prefix, quote, color) =>
        `${prefix}${quote}${replaceColors(color, exact, chart, true)}${quote}`
    );

  return `${withRewrittenStyles}\n<style ${NORMALIZER_ATTRIBUTE}="true">${NORMALIZER_STYLES}</style>`;
};
