/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSpecObject } from './spec';

/** Strings that a CSS parser could turn into a fetch: `url(…)`, `image-set(…)`, or an escape that hides one. */
const FETCHING_CSS = /url\s*\(|image-set\s*\(|src\s*\(|\\/i;
const KEYWORD = /^[a-z-]+$/i;
/** Read as text or ARIA, never as CSS. */
const TEXT_PROPERTIES = new Set([
  'text',
  'description',
  'ariaRole',
  'ariaRoleDescription',
  'ariaLabel',
]);

/**
 * Removes every link and image source from the scene, and every style value
 * that could fetch. Signals and data can set these, so the spec walk alone
 * cannot.
 */
export const scrubScene = (node: unknown): void => {
  if (!isSpecObject(node)) {
    return;
  }
  delete node.href;
  delete node.url;
  for (const key of ['blend', 'cursor']) {
    const value = node[key];
    if (typeof value === 'string' && !KEYWORD.test(value)) {
      delete node[key];
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && !TEXT_PROPERTIES.has(key) && FETCHING_CSS.test(value)) {
      delete node[key];
    }
  }
  if (Array.isArray(node.items)) {
    for (const item of node.items) {
      scrubScene(item);
    }
  }
};

/** The view's background, or `transparent` when it could fetch; the spec and its signals set it outside the scene. */
export const safeBackground = (value: unknown): unknown =>
  typeof value === 'string' && FETCHING_CSS.test(value) ? 'transparent' : value;
