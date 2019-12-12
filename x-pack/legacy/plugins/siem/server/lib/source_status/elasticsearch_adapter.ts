/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { SourceStatusAdapter } from './index';

export class ElasticsearchSourceStatusAdapter implements SourceStatusAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async hasIndices(request: FrameworkRequest, indexNames: string | string[]) {
    return this.framework
      .callWithRequest(request, 'search', {
        index: indexNames,
        size: 0,
        terminate_after: 1,
        allow_no_indices: true,
      })
      .then(
        response => response._shards.total > 0,
        err => {
          if (err.status === 404) {
            return false;
          }
          throw err;
        }
      );
  }
}
