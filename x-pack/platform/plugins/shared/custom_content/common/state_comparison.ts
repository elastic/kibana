/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { timeRangeComparators, titleComparators } from '@kbn/presentation-publishing';
import type { CustomContentEmbeddableState } from '../server';

export const customContentStateComparison: SerializedStateComparison<CustomContentEmbeddableState> =
  {
    comparators: {
      ...titleComparators,
      ...timeRangeComparators,
      esql_query: 'deepEquality',
      template: 'referenceEquality',
    },
  };
