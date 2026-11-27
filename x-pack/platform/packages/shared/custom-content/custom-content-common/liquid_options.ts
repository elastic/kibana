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
