/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lowercases free text and strips characters that aren't letters, numbers, hyphens, or
 * underscores -- called on every keystroke (see the flyouts' `handleNameChange`).
 *
 * Deliberately does *not* collapse repeated separators or trim leading/trailing ones: doing
 * that live, on every render, would strip out a hyphen/underscore the instant it's typed at the
 * end of the field (the most common place while typing left-to-right), making it look like
 * those keys don't work at all. That normalization is handled separately by
 * `finalizeViewName`, applied only once the name is finalized (on blur, and again defensively
 * before saving).
 */
export const sanitizeViewNameInput = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

/**
 * Collapses repeated hyphens/underscores and trims leading/trailing ones, matching the
 * convention used for index names elsewhere in Kibana (and required by the real `_query/view`
 * name format). Hyphens and underscores are both preserved as typed (neither is converted into
 * the other) rather than only allowing one of the two.
 */
export const finalizeViewName = (value: string): string =>
  value
    .replace(/-{2,}/g, '-')
    .replace(/_{2,}/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '');

/** Combines `sanitizeViewNameInput` and `finalizeViewName` for callers that want both steps in
 * one go (e.g. finalizing a name that hasn't already been sanitized live via input changes). */
export const slugifyViewName = (value: string): string =>
  finalizeViewName(sanitizeViewNameInput(value));
