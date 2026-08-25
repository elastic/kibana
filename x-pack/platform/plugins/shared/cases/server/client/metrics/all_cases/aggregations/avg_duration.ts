/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../../common/constants';
import type { CasesMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';

export class AverageDuration implements AggregationBuilder<CasesMetricsResponse> {
  build() {
    return {
      mttr: {
        avg: {
          field: `${CASE_SAVED_OBJECT}.attributes.duration`,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as MTTRAggregate;

    const mttr = aggs?.mttr?.value ?? null;

    return { mttr };
  }

  getName() {
    return 'mttr';
  }
}

type MTTRAggregate = MTTRAggregateResponse | undefined;

interface MTTRAggregateResponse {
  mttr?: {
    value: number;
  };
}
