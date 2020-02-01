/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { SourceStatusAdapter } from './index';
import { buildQuery } from './query.dsl';
import { ApmServiceNameAgg } from './types';

const APM_INDEX_NAME = 'apm-*-transaction*';

export class ElasticsearchSourceStatusAdapter implements SourceStatusAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async hasIndices(request: FrameworkRequest, indexNames: string[]) {
    // Note: Additional check necessary for APM-specific index. For details see: https://github.com/elastic/kibana/issues/56363
    // Only verify if APM data exists if indexNames includes `apm-*-transaction*` (default included apm index)
    const includesApmIndex = indexNames.includes(APM_INDEX_NAME);
    const hasApmDataReq = includesApmIndex
      ? this.framework.callWithRequest<{}, ApmServiceNameAgg>(
          request,
          'search',
          buildQuery({ defaultIndex: [APM_INDEX_NAME] })
        )
      : Promise.resolve(undefined);

    // Remove APM index if exists, and only query if length > 0 in case it's the only index provided
    const nonApmIndexNameArray = indexNames.filter(name => name !== APM_INDEX_NAME);
    const indexCheckReq =
      nonApmIndexNameArray.length > 0
        ? this.framework.callWithRequest(request, 'search', {
            index: nonApmIndexNameArray,
            size: 0,
            terminate_after: 1,
            allow_no_indices: true,
          })
        : Promise.resolve(undefined);

    try {
      const [apmResponse, indexCheckResponse] = await Promise.all([hasApmDataReq, indexCheckReq]);

      return (
        (apmResponse?.aggregations?.total_service_names?.value ?? -1) > 0 ||
        (indexCheckResponse?._shards.total ?? -1) > 0
      );
    } catch (err) {
      if (err.status === 404) {
        return false;
      }
      throw err;
    }
  }
}
