/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomInt } from 'crypto';

const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random id which can be used for tool result id.
 */
export function getToolResultId(len = 4): string {
  return Array.from({ length: len }, () => charset[randomInt(charset.length)]).join('');
}
