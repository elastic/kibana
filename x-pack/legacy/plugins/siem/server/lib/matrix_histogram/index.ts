/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
export * from './elasticsearch_adapter';
import { MatrixHistogramAdapter } from './types';
import { MatrixHistogramOverTimeData } from '../../graphql/types';

export class MatrixHistogram {
  constructor(private readonly adapter: MatrixHistogramAdapter) {}

  public async getMatrixHistogramData(
    req: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    return this.adapter.getHistogramData(req, options);
  }
}
