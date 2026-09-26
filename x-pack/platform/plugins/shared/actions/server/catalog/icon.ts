/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

export const getContentHash = (raw: string): string =>
  `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;

export const toIconDataUrl = (iconRaw: string): string =>
  `data:image/svg+xml;base64,${Buffer.from(iconRaw, 'utf8').toString('base64')}`;

export const validateSvgIcon = (raw: string): void => {
  if (!/<svg[\s>]/i.test(raw)) {
    throw new Error('Declarative connector icon is not an SVG document.');
  }
  const unsafeMarkup =
    /<script[\s>]|<style[\s>]|<foreignObject[\s>]|\son[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?!#)|url\(\s*["']?(?!#)/i;
  if (unsafeMarkup.test(raw)) {
    throw new Error('Declarative connector icon contains unsupported active or external content.');
  }
};
