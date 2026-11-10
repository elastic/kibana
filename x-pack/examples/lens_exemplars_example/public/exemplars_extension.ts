/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import {
  queryHasStatsCommand,
  queryHasTsSourceCommand,
  type LensExtension,
  type LensOverlayPoint,
} from '@kbn/lens-common';

export const EXEMPLARS_APP_ID = 'lens_exemplars_example';
export const EXEMPLARS_EXTENSION_ID = 'lensExemplarsExample.exemplars';

const EXEMPLARS_LIMIT = 200;
const SIMULATED_EXEMPLARS_LIMIT = 30;
const TIMESTAMP_COLUMN = '@timestamp';
const VALUE_COLUMN = 'value';
const AGGREGATED_FIELD_REGEX =
  /\bSTATS\b[\s\S]*?\b(?:AVG|SUM|MIN|MAX|MEDIAN)\s*\(\s*([\w.@]+)\s*\)/i;

export interface Exemplar {
  readonly id: string;
  readonly timestamp: string;
  readonly value: number;
  readonly simulated: boolean;
  readonly fields: Readonly<Record<string, unknown>>;
}

interface ExemplarsQuery {
  readonly esql: string;
  readonly simulated: boolean;
}

/**
 * Real exemplars come from `SET exemplars` on `TS ... | STATS` queries. Any other query gets
 * simulated exemplars: the largest raw samples of the aggregated field, renamed to `value`.
 */
export const getExemplarsQuery = (esql: string): ExemplarsQuery | undefined => {
  if (queryHasTsSourceCommand(esql)) {
    return { esql: `SET exemplars={"limit": ${EXEMPLARS_LIMIT}};\n${esql}`, simulated: false };
  }
  const [, field] = esql.match(AGGREGATED_FIELD_REGEX) ?? [];
  if (!field) {
    return undefined;
  }
  return {
    esql: [
      `FROM ${getIndexPatternFromESQLQuery(esql)}`,
      `WHERE ${field} IS NOT NULL`,
      `SORT ${field} DESC`,
      `LIMIT ${SIMULATED_EXEMPLARS_LIMIT}`,
      `EVAL ${VALUE_COLUMN} = ${field}`,
    ].join('\n| '),
    simulated: true,
  };
};

interface CreateExemplarsExtensionParams {
  readonly onExemplarClick: (exemplar: Exemplar) => void;
}

/** Lens extension drawing clickable exemplars over the XY charts of this example app. */
export const createExemplarsExtension = ({
  onExemplarClick,
}: CreateExemplarsExtensionParams): LensExtension => {
  const exemplarsById = new Map<string, Exemplar>();
  let nextId = 0;

  return {
    id: EXEMPLARS_EXTENSION_ID,
    visualizationTypes: ['lnsXY'],
    isApplicable: ({ executionContext }, { esql }) =>
      executionContext?.name === EXEMPLARS_APP_ID &&
      esql !== undefined &&
      queryHasStatsCommand(esql) &&
      getExemplarsQuery(esql) !== undefined,
    fetchOverlay: async ({ layer, executeEsql }) => {
      const query = layer.esql ? getExemplarsQuery(layer.esql) : undefined;
      if (!query) {
        return undefined;
      }
      const { rows } = await executeEsql(query.esql);

      const points = rows.flatMap((row): LensOverlayPoint[] => {
        const timestamp = String(row[TIMESTAMP_COLUMN]);
        const x = Date.parse(timestamp);
        const value = Number(row[VALUE_COLUMN]);
        if (Number.isNaN(x) || Number.isNaN(value)) {
          return [];
        }
        const id = `exemplar-${nextId++}`;
        exemplarsById.set(id, { id, timestamp, value, simulated: query.simulated, fields: row });
        return [{ id, x, y: value }];
      });

      return {
        type: 'points',
        title: query.simulated ? 'Simulated exemplars' : 'Exemplars',
        points,
      };
    },
    onPointClick: ({ pointId }) => {
      const exemplar = exemplarsById.get(pointId);
      if (exemplar) {
        onExemplarClick(exemplar);
      }
    },
  };
};
