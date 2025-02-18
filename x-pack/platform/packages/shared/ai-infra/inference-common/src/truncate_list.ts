/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';

export function truncateList<T>(values: T[], limit: number): Array<T | string> {
  if (values.length <= limit) {
    return values;
  }

  return [...take(values, limit), `${values.length - limit} more values`];
}
