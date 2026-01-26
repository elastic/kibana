/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * u200B is a non-width white-space character, which allows the browser to efficiently
 * word-wrap right after the dot without us having to draw a lot of extra DOM elements, etc
 */
export function wrapOnDot(str?: string): string {
  return str ? str.replace(/\./g, '.\u200B') : '';
}
