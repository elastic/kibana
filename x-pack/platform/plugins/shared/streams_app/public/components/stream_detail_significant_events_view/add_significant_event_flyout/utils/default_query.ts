/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQueryKql } from '@kbn/streams-schema';
import { v4 } from 'uuid';

export function defaultQuery(): StreamQueryKql {
  return {
    id: v4(),
    title: '',
    kql: {
      query: '',
    },
    feature: undefined,
  };
}
