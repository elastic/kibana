/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AI_PANEL_EMBEDDABLE_TYPE = 'ai_panel';
export const AI_PANEL_APP_NAME = 'AI Panel';

export const AI_PANEL_MAX_PROMPT_LENGTH = 10_000;
export const AI_PANEL_MAX_ESQL_QUERY_LENGTH = 1_000_000;

// injectCsp() in template_fill.ts de-dupes on an exact string match of this value.
export const AI_PANEL_CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';
