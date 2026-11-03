/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum length of a page snapshot, in characters (keeps the result within the tool result guardrail). */
export const SNAPSHOT_MAX_CHARS = 20_000;

/** Maximum length of an element's accessible name in a snapshot. */
export const NAME_MAX_CHARS = 80;

/** Maximum length of a form control value in a snapshot. */
export const VALUE_MAX_CHARS = 200;

/** Maximum length of a text line in a snapshot. */
export const TEXT_MAX_CHARS = 300;

/** Number of snapshot generations whose refs stay resolvable. */
export const KEPT_GENERATIONS = 3;

/** Attribute set on the root element of every Agent Builder chat surface. */
export const CHAT_SURFACE_ATTRIBUTE = 'data-agent-builder-surface';

/** Matches the Agent Builder chat UI, which the snapshot walker skips. */
export const CHAT_SURFACE_SELECTOR = `[${CHAT_SURFACE_ATTRIBUTE}]`;
