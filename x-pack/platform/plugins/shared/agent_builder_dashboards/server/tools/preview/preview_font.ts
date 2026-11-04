/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createGlyphFont, type GlyphFontData, type SvgFont } from '@elastic/charts/dist/headless';

// Advance widths and outlines of Inter (Regular, Medium, SemiBold, Bold), extracted from the font
// files Kibana serves (`src/core/packages/apps/server-internal/assets/fonts/inter`).
const GLYPHS_FILE = join(__dirname, 'fonts', 'inter_glyphs.json');
const FALLBACK_FAMILY = 'Inter, Helvetica, Arial, sans-serif';

let previewFont: SvgFont | undefined;

/** Escapes text for use in SVG markup. */
export const escapeXml = (text: string): string =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char)
  );

/**
 * The font previews measure and draw text with: Inter, the font Kibana uses, drawn as outlines so
 * the PNG does not depend on the fonts installed on the server. Loaded on first use.
 */
export const getPreviewFont = (): SvgFont => {
  previewFont ??= createGlyphFont(JSON.parse(readFileSync(GLYPHS_FILE, 'utf8')) as GlyphFontData);
  return previewFont;
};

/** Width of `text` in pixels for a CSS `font` shorthand, e.g. `'600 14px Inter'`. */
export const measurePreviewText = (text: string, font: string): number =>
  getPreviewFont().measure(text, font);

/**
 * Draws one line of text as an SVG element, anchored at `x` on the alphabetic baseline `y`: a path
 * of Inter outlines, or `<text>` when Inter lacks a character.
 */
export const previewTextSvg = (
  text: string,
  {
    font,
    x,
    y,
    fill,
    anchor = 'start',
  }: { font: string; x: number; y: number; fill: string; anchor?: 'start' | 'middle' | 'end' }
): string => {
  const width = measurePreviewText(text, font);
  const startX = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const path = getPreviewFont().toPath(text, font, startX, y);
  if (path !== undefined) {
    return path ? `<path d="${path}" fill="${fill}"/>` : '';
  }
  const size = /(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '12';
  const weight = /\b([1-9]00|bold)\b/.exec(font)?.[1];
  const weightAttribute = weight ? ` font-weight="${weight}"` : '';
  return `<text x="${x}" y="${y}" font-family="${FALLBACK_FAMILY}" font-size="${size}"${weightAttribute} fill="${fill}" text-anchor="${anchor}">${escapeXml(
    text
  )}</text>`;
};
