/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ClusterPutComponentTemplateRequest,
  ClusterPutComponentTemplateResponse,
  FieldCapsRequest,
  FieldCapsResponse,
  Indices,
  IndicesGetIndexTemplateRequest,
  IndicesGetIndexTemplateResponse,
  IndicesGetMappingResponse,
  IndicesGetSettingsResponse,
  IndicesPutSettingsRequest,
  IndicesPutSettingsResponse,
  IndicesRolloverResponse,
} from '@elastic/elasticsearch/lib/api/types';

type DatasetQualityESSearchParams = ESSearchRequest & {
  size: number;
};

export type DatasetQualityESClient = ReturnType<typeof createDatasetQualityESClient>;

export function createDatasetQualityESClient(esClient: ElasticsearchClient) {
  return {
    search<TDocument, TParams extends DatasetQualityESSearchParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      return esClient.search<TDocument>(searchParams) as Promise<any>;
    },
    msearch<TDocument, TParams extends DatasetQualityESSearchParams>(
      index = {} as { index?: Indices },
      searches: TParams[]
    ): Promise<{
      responses: Array<InferSearchResponseOf<TDocument, TParams>>;
    }> {
      return esClient.msearch({
        searches: searches.map((search) => [index, search]).flat(),
      }) as Promise<any>;
    },
    fieldCaps(params: FieldCapsRequest): Promise<FieldCapsResponse> {
      return esClient.fieldCaps(params);
    },
    mappings(params: { index: string }): Promise<IndicesGetMappingResponse> {
      return esClient.indices.getMapping(params);
    },
    settings(params: { index: string }): Promise<IndicesGetSettingsResponse> {
      return esClient.indices.getSettings(params);
    },
    updateComponentTemplate(
      params: ClusterPutComponentTemplateRequest
    ): Promise<ClusterPutComponentTemplateResponse> {
      return esClient.cluster.putComponentTemplate(params);
    },
    updateSettings(params: IndicesPutSettingsRequest): Promise<IndicesPutSettingsResponse> {
      return esClient.indices.putSettings(params);
    },
    rollover(params: { alias: string }): Promise<IndicesRolloverResponse> {
      return esClient.indices.rollover(params);
    },
    indexTemplates(
      params: IndicesGetIndexTemplateRequest
    ): Promise<IndicesGetIndexTemplateResponse> {
      return esClient.indices.getIndexTemplate(params);
    },
  };
}
