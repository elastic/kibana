/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith, uniq } from 'lodash';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';
import { getAllowedListForPrefix } from '../../../../common/ecs_allowed_list';

interface Bucket {
  key: string;
  doc_count: number;
}

interface DataSetResponse {
  modules: {
    buckets: Bucket[];
  };
  dataSets: {
    buckets: Bucket[];
  };
}

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: InfraBackendFrameworkAdapter;

  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getIndexFields(
    request: InfraFrameworkRequest,
    indices: string
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(request);
    const response = await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
    const { dataSets, modules } = await this.getDataSetsAndModules(request, indices);
    const allowedList = modules.reduce(
      (acc, name) => uniq([...acc, ...getAllowedListForPrefix(name)]),
      [] as string[]
    );
    const dataSetsWithAllowedList = [...allowedList, ...dataSets];
    return response.map(field => ({
      ...field,
      displayable: dataSetsWithAllowedList.some(name => startsWith(field.name, name)),
    }));
  }

  private async getDataSetsAndModules(
    request: InfraFrameworkRequest,
    indices: string
  ): Promise<{ dataSets: string[]; modules: string[] }> {
    const params = {
      index: indices,
      allowNoIndices: true,
      ignoreUnavailable: true,
      body: {
        aggs: {
          modules: {
            terms: {
              field: 'event.modules',
              size: 1000,
            },
          },
          dataSets: {
            terms: {
              field: 'event.dataset',
              size: 1000,
            },
          },
        },
      },
    };
    const response = await this.framework.callWithRequest<{}, DataSetResponse>(
      request,
      'search',
      params
    );
    if (!response.aggregations) {
      return { dataSets: [], modules: [] };
    }
    const { modules, dataSets } = response.aggregations;
    return {
      modules: modules.buckets.map(bucket => bucket.key),
      dataSets: dataSets.buckets.map(bucket => bucket.key),
    };
  }
}
