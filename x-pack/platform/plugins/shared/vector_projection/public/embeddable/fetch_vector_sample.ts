/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { buildEsQuery, isOfAggregateQueryType, type Filter, type TimeRange } from '@kbn/es-query';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { VectorProjectionServices } from '../services';
import type { VectorProjectionConfig } from '../types';
import { getVectorFieldKind } from '../components/field_utils';
import { buildSemanticTextProbeRequest, parseDenseSemanticTextFields } from './semantic_text';
import {
  buildVectorSampleRequest,
  parseVectorSampleResponse,
  type VectorFieldKind,
  type VectorSample,
} from './vector_sample';

const SEMANTIC_TEXT_PROBE_SIZE = 20;

/**
 * Vector samples routinely exceed the 10 MB `search.max_async_search_response_size` limit of the
 * default async strategy, so they use a plain `_search`, which isn't stored.
 */
const searchStrategy = ES_SEARCH_STRATEGY;

/**
 * Kibana rejects Elasticsearch responses over 100 MB, so samples are fetched in pages. 500 dense
 * vectors stay around 25 MB even at 4096 dimensions. semantic_text hits carry every chunk embedding
 * of every semantic field, so they use smaller pages.
 */
const SAMPLE_PAGE_SIZE: Readonly<Record<VectorFieldKind, number>> = {
  dense_vector: 500,
  semantic_text: 100,
};

const otherLabel = i18n.translate('xpack.vectorProjection.legend.other', {
  defaultMessage: 'Other',
});

const getAppliedTimeRange = ({ timeRange, timeslice }: FetchContext): TimeRange | undefined =>
  timeslice
    ? {
        from: new Date(timeslice[0]).toISOString(),
        to: new Date(timeslice[1]).toISOString(),
        mode: 'absolute',
      }
    : timeRange;

export const fetchVectorSample = async (
  { core, data }: VectorProjectionServices,
  dataView: DataView,
  config: Pick<VectorProjectionConfig, 'vector_field' | 'label_field' | 'sample_size'>,
  fetchContext: FetchContext,
  abortSignal: AbortSignal
): Promise<VectorSample> => {
  const { vector_field: vectorField, label_field: labelField, sample_size: sampleSize } = config;
  const vectorFieldKind = getVectorFieldKind(dataView, vectorField);
  const filters: Filter[] = [...(fetchContext.filters ?? [])];
  const timeRange = getAppliedTimeRange(fetchContext);
  if (timeRange) {
    const timeFilter = data.query.timefilter.timefilter.createFilter(dataView, timeRange);
    if (timeFilter) filters.push(timeFilter);
  }
  const { query } = fetchContext;
  const kqlQuery = query && !isOfAggregateQueryType(query) ? [query] : [];

  const index = dataView.getIndexPattern();
  const esQuery = buildEsQuery(dataView, kqlQuery, filters, getEsQueryConfig(core.uiSettings));
  const runtimeMappings = dataView.getRuntimeMappings();

  const hits: estypes.SearchHit[] = [];
  while (hits.length < sampleSize) {
    const size = Math.min(SAMPLE_PAGE_SIZE[vectorFieldKind], sampleSize - hits.length);
    const params = buildVectorSampleRequest({
      index,
      query: esQuery,
      vectorField,
      vectorFieldKind,
      labelField,
      size,
      from: hits.length,
      runtimeMappings,
    });
    const { rawResponse } = await lastValueFrom(
      data.search.search({ params }, { abortSignal, strategy: searchStrategy })
    );
    const page = rawResponse.hits.hits;
    hits.push(...page);
    if (page.length < size) break;
  }

  return parseVectorSampleResponse(hits, {
    vectorField,
    vectorFieldKind,
    labelField,
    otherLabel,
  });
};

/**
 * Finds semantic_text fields backed by dense embeddings by inspecting a few documents, since the
 * data view field list doesn't distinguish semantic_text from text.
 */
export const fetchDenseSemanticTextFields = async (
  { data }: VectorProjectionServices,
  dataView: DataView,
  abortSignal: AbortSignal
): Promise<string[]> => {
  const params = buildSemanticTextProbeRequest(
    dataView.getIndexPattern(),
    SEMANTIC_TEXT_PROBE_SIZE
  );
  const { rawResponse } = await lastValueFrom(
    data.search.search({ params }, { abortSignal, strategy: searchStrategy })
  );
  return parseDenseSemanticTextFields(rawResponse.hits.hits).filter((name) =>
    dataView.getFieldByName(name)
  );
};
