/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { IScopedClusterClient } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import {
  SignificantEventsPreviewResponse,
  StreamQueryKql,
  Streams,
  getIndexPatternsForStream,
} from '@kbn/streams-schema';
import { getKqlAsCommandArg } from '../../../lib/streams/assets/query/helpers/query';

type PreviewStreamQuery = Pick<StreamQueryKql, 'kql'>;

export async function previewSignificantEvents(
  params: {
    definition: Streams.all.Definition;
    query: PreviewStreamQuery;
    from: Date;
    to: Date;
  },
  dependencies: {
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsPreviewResponse> {
  const { from, to, definition, query } = params;
  const { scopedClusterClient } = dependencies;

  const esqlRequest = createEsqlRequest({
    index: getIndexPatternsForStream(definition),
    from,
    query,
    to,
  });

  const esqlResponse = await scopedClusterClient.asCurrentUser.esql
    .query({
      query: esqlRequest,
    })
    .catch((err) => {
      throw badRequest(err.message);
    });
  const { columns, values } = esqlResponse;

  const dateColIndex = columns.findIndex((col) => col.name === 'interval');
  const countColIndex = columns.findIndex((col) => col.name === 'count');
  const typeColIndex = columns.findIndex((col) => col.name === 'type');
  const pValueColIndex = columns.findIndex((col) => col.name === 'pvalue');
  if (dateColIndex === -1 || countColIndex === -1 || typeColIndex === -1 || pValueColIndex === -1) {
    return { ...query, change_points: { type: {} }, occurrences: [] };
  }

  const occurrences = values.map((row) => ({
    date: row[dateColIndex] as string,
    count: row[countColIndex] as number,
  }));

  const changePoints = values
    .map((row, index) => ({
      type: row[typeColIndex] as ChangePointType,
      pValue: row[pValueColIndex] as number,
      changePoint: index,
    }))
    .filter((row) => row.type != null && row.pValue != null && !isNaN(row.pValue))
    .reduce((acc, row) => {
      acc[row.type] = { p_value: row.pValue, change_point: row.changePoint };
      return acc;
    }, {} as Record<ChangePointType, { p_value: number; change_point: number }>);

  return {
    ...query,
    change_points: { type: changePoints },
    occurrences,
  };
}

function createEsqlRequest({
  index,
  from,
  query,
  to,
}: {
  index: string[];
  from: Date;
  query: Pick<StreamQueryKql, 'kql'>;
  to: Date;
}): string {
  return `FROM ${index.join(',')}
  | WHERE @timestamp >= "${from.toISOString()}" AND @timestamp <= "${to.toISOString()}"
  | WHERE KQL("${getKqlAsCommandArg(query.kql.query)}")
  | STATS count = COUNT(*) BY interval = BUCKET(@timestamp, 50, "${from.toISOString()}", "${to.toISOString()}")
  | CHANGE_POINT count ON interval`;
}
