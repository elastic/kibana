/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TextScale = 'small' | 'medium' | 'large';

export function isTextScale(maybeTextScale: string): maybeTextScale is TextScale {
  return ['small', 'medium', 'large'].includes(maybeTextScale);
}
