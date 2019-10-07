/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith, uniq, first } from 'lodash';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';
import { getAllowedListForPrefix } from '../../../../common/ecs_allowed_list';

interface Bucket {
  key: { dataset: string };
  doc_count: number;
}

interface DataSetResponse {
  datasets: {
    buckets: Bucket[];
    after_key: {
      dataset: string;
    };
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
        size: 0,
        aggs: {
          datasets: {
            composite: {
              sources: [
                {
                  dataset: {
                    terms: {
                      field: 'event.dataset',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const buckets = await this.getAllCompositeData(request, params);
    const dataSets = buckets.map(bucket => bucket.key.dataset);
    const modules = dataSets.reduce(
      (acc, dataset) => {
        const module = first(dataset.split(/\./));
        return module ? uniq([...acc, module]) : acc;
      },
      [] as string[]
    );
    return { modules, dataSets };
  }

  private async getAllCompositeData(
    request: InfraFrameworkRequest,
    query: any,
    previousBuckets: Bucket[] = []
  ): Promise<Bucket[]> {
    const response = await this.framework.callWithRequest<{}, DataSetResponse>(
      request,
      'search',
      query
    );

    // if ES doesn't return an aggregations key, something went seriously wrong.
    if (!response.aggregations) {
      throw new Error('Whoops!, `aggregations` key must always be returned.');
    }

    // Nothing available, return the previous buckets.
    if (response.hits.total.value === 0) {
      return previousBuckets;
    }

    const currentBuckets = response.aggregations.datasets.buckets;

    // if there are no currentBuckets then we are finished paginating through the results
    if (currentBuckets.length === 0) {
      return previousBuckets;
    }

    // There is possibly more data, concat previous and current buckets and call ourselves recursively.
    const newQuery = { ...query };
    newQuery.body.aggs.datasets.composite.after = response.aggregations.datasets.after_key;
    return this.getAllCompositeData(request, newQuery, previousBuckets.concat(currentBuckets));
  }
}
