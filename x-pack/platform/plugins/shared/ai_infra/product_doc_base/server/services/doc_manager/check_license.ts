/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/server';

export const checkLicense = (license: ILicense): boolean => {
  const result = license.check('elastic documentation', 'enterprise');
  return result.state === 'valid';
};
