/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import Path from 'path';
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { FALLBACK_FONT, FONT_ASSETS_DIR, KIBANA_FONT_FILES } from '../worker/fonts';
import type { ComposedPage } from './page_composer';
import { composePage } from './page_composer';

let backend: ReturnType<typeof createTakumiImageBackend> | undefined;

/**
 * Takumi never reads system fonts: without these, every panel's text renders in its bundled
 * Geist. Same Inter / Elastic UI Numeric files Kibana's own pages use (`worker/fonts.ts`),
 * so text metrics line up with what the booted page measured.
 */
const loadFonts = () => [
  ...KIBANA_FONT_FILES.map(({ family, weight, file }) => ({
    name: family,
    data: fs.readFileSync(Path.join(FONT_ASSETS_DIR, file)),
    ...(weight ? { weight } : {}),
    ...(family === 'Inter' ? { generic: 'sans-serif' as const } : {}),
  })),
  // Registered last: Takumi falls back through registration order, so scripts Inter lacks
  // (CJK) reach this one instead of failing with "no registered font covers <char>".
  ...(fs.existsSync(FALLBACK_FONT.file)
    ? [{ name: FALLBACK_FONT.family, data: fs.readFileSync(FALLBACK_FONT.file) }]
    : []),
];

/** One takumi backend per process: it owns a native renderer and a font cache. */
export const getTakumiBackend = () => {
  if (!backend) {
    backend = createTakumiImageBackend({ fonts: loadFonts() });
  }
  return backend;
};
const getBackend = getTakumiBackend;

export const rasterizePageToPng = async (page: ComposedPage): Promise<Buffer> => {
  const { html, css, width, height } = composePage(page);
  return getBackend().png({ html, css, width, height });
};

/** Renders one PDF document, one takumi "page" per `ComposedPage` -- see `printable_pdf_v2`'s `print` layout for the Chromium-era equivalent of one-panel-per-page. */
export const rasterizePagesToPdf = async (pages: ComposedPage[]): Promise<Buffer> => {
  if (pages.length === 0) {
    throw new Error('rasterizePagesToPdf: at least one page is required');
  }
  const composed = pages.map((page) => composePage(page));
  const { width, height } = composed[0];
  const css = composed.map((c) => c.css).join('\n');
  return getBackend().pdf({
    pages: composed.map(({ html }) => ({ html })),
    css,
    width,
    height,
  });
};
