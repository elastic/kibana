/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `page` with every `<style>` element in its markup moved into its stylesheet, once each and after the surface's
 * own, as a browser would apply them. A rasterizer lays markup out against `css` alone, so a primitive that carries
 * its stylesheet in its markup, as a DOM-drawn chart does, would otherwise lose it.
 */
export const hoistStyles = <T extends { html: string; css: string }>(page: T): T => {
  const sheets = new Set<string>();
  const html = page.html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css: string) => {
    sheets.add(css);
    return '';
  });
  return sheets.size === 0 ? page : { ...page, html, css: [page.css, ...sheets].join('\n') };
};

/**
 * `page` without `mask-image` declarations, in its stylesheet and its markup's `style` attributes. Takumi's PDF writer
 * draws nothing under a mask, though its PNG writer does; Elastic Charts' legend masks only to fade its scroll edges.
 */
export const withoutMasks = <T extends { html: string; css: string }>(page: T): T => {
  const strip = (text: string) => text.replace(/(?:-webkit-)?mask-image\s*:[^;}"]*;?/gi, '');
  return { ...page, html: strip(page.html), css: strip(page.css) };
};
