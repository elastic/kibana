/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { TermsAggregate } from '@elastic/elasticsearch/api/types';

import { FtrService } from '../ftr_provider_context';

export class SavedObjectInfoService extends FtrService {
  private readonly es = this.ctx.getService('es');

  public async getTypes(index = '.kibana') {
    try {
      const { body } = await this.es.search({
        index,
        size: 0,
        body: {
          aggs: {
            savedobjs: {
              terms: {
                field: 'type',
              },
            },
          },
        },
      });

      const agg = body.aggregations?.savedobjs as
        | TermsAggregate<{ key: string; doc_count: number }>
        | undefined;

      if (!agg?.buckets) {
        throw new Error(
          `expected es to return buckets of saved object types: ${inspect(body, { depth: 100 })}`
        );
      }

      return agg.buckets;
    } catch (error) {
      throw new Error(`Error while searching for saved object types: ${error}`);
    }
  }
}
