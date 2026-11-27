/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The options of the Liquid engine that fills a custom content template. The renderer fills the
 * template with them and the server checks the syntax of a generated template with the same ones,
 * so a template the server accepts is one the renderer can parse.
 */
export const CUSTOM_CONTENT_LIQUID_OPTIONS = {
  strictFilters: false,
  strictVariables: false,
  dynamicPartials: false,
  relativeReference: false,
  outputEscape: 'escape',
  renderLimit: 1_000,
  memoryLimit: 100_000_000,
  parseLimit: 1_000_000,
} as const;

/**
 * Filters a template may not use. `raw` switches off the HTML escaping of a value, which would let
 * data (a hostname in a log line, say) write markup, including the `data-cc-*` attributes that make
 * an element act on a click. The renderer turns each into a no-op and the server rejects the
 * template, so a saved panel cannot get around either.
 */
export const CUSTOM_CONTENT_FORBIDDEN_FILTERS: readonly string[] = ['raw'];

/**
 * Tags that write a value without escaping it. Only `{{ }}` applies `outputEscape`: `echo` (also
 * inside a `liquid` block) and `cycle` write a value as markup, which would let data write elements
 * of its own. The server rejects a generated template that uses them, and the renderer makes them
 * escape what they write, so a panel that already uses one keeps rendering.
 */
export const CUSTOM_CONTENT_UNESCAPED_TAGS: readonly string[] = ['echo', 'cycle'];
