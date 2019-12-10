/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';

export const generateId = (
  docIndex: string,
  docId: string,
  version: string,
  ruleId: string
): string =>
  createHash('sha256')
    .update(docIndex.concat(docId, version, ruleId))
    .digest('hex');
