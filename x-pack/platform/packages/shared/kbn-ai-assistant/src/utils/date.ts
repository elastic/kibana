/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

export function getAbsoluteTime(range: string, opts: Parameters<typeof datemath.parse>[1] = {}) {
  const parsed = datemath.parse(range, opts);
  if (parsed) {
    return parsed.valueOf();
  }
}
