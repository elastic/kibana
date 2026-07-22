/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import { appendLimitToQuery, getTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import type { ESQLColumn, ESQLSearchResponse } from '@kbn/es-types';
import { CUSTOM_CONTENT_SAMPLE_ROW_COUNT } from '../../common/constants';
const MAX_SANITIZED_CELL_LENGTH = 500;

const HTML_ANGLE_BRACKETS = /[<>]/g;
const LINE_BREAKS = /[\r\n]+/g;
const LIQUID_OUTPUT_DELIMITER = /\{\{/g;
const LIQUID_TAG_DELIMITER = /\{%/g;

export function sanitizeCellValue(v: unknown): string {
  const withoutHtmlAndLineBreaks = String(v ?? '')
    .replace(HTML_ANGLE_BRACKETS, '')
    .replace(LINE_BREAKS, ' ');

  const withoutLiquidSyntax = withoutHtmlAndLineBreaks
    .replace(LIQUID_OUTPUT_DELIMITER, '{ {')
    .replace(LIQUID_TAG_DELIMITER, '{ %');

  return withoutLiquidSyntax.slice(0, MAX_SANITIZED_CELL_LENGTH);
}

export type { ESQLColumn };

export async function runEsqlQuery(
  esClient: ElasticsearchClient,
  esqlQuery: string,
  timeRange?: { from: string; to: string } | null
): Promise<ESQLSearchResponse> {
  const hasTimeParams = getTimeFieldFromESQLQuery(esqlQuery) !== undefined;

  const esqlParams =
    hasTimeParams && timeRange
      ? [
          { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
          { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
        ]
      : undefined;

  const sampledQuery = appendLimitToQuery(esqlQuery, CUSTOM_CONTENT_SAMPLE_ROW_COUNT);

  const result = await esClient.esql.query(
    {
      query: sampledQuery,
      ...(esqlParams ? { params: esqlParams } : {}),
    },
    { requestTimeout: '10s' }
  );

  return {
    columns: result.columns as ESQLColumn[],
    values: result.values as ESQLSearchResponse['values'],
  };
}
