/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';
import { v4 } from 'uuid';

export function defaultQuery(): StreamQuery {
  return {
    id: v4(),
    title: '',
    kql: {
      query: '',
    },
    esql: {
      query: '',
    },
    feature: undefined,
  };
}
