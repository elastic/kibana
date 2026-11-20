/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import {
  queryHasStatsCommand,
  queryHasTsSourceCommand,
  type LensXYOverlayDatum,
  type LensXYOverlayProvider,
} from '@kbn/lens-common';

export const EXEMPLARS_APP_ID = 'lens_exemplars_example';
export const EXEMPLARS_OVERLAY_PROVIDER_ID = 'lensExemplarsExample.exemplars';
export const EXEMPLARS_FEATURE_FLAG = 'lensExemplarsExample.enabled';

/** `executionContext.type` of the surfaces drawing exemplars: this example app, Dashboard and Discover. */
const SUPPORTED_SURFACE_TYPES: ReadonlySet<string> = new Set([
  EXEMPLARS_APP_ID,
  'dashboard',
  'discover',
]);

const EXEMPLARS_LIMIT = 200;
const SIMULATED_EXEMPLARS_LIMIT = 30;
const TIMESTAMP_COLUMN = '@timestamp';
const VALUE_COLUMN = 'value';
const SIMULATED_COLUMN = 'simulated_exemplar';
const AGGREGATED_FIELD_REGEX =
  /\bSTATS\b[\s\S]*?\b(?:AVG|SUM|MIN|MAX|MEDIAN)\s*\(\s*([\w.@]+)\s*\)/i;

export interface Exemplar {
  readonly simulated: boolean;
  readonly fields: Readonly<LensXYOverlayDatum>;
}

const getTimestamp = (row: LensXYOverlayDatum): number => Date.parse(String(row[TIMESTAMP_COLUMN]));

const isDrawable = (row: LensXYOverlayDatum): boolean =>
  !Number.isNaN(getTimestamp(row)) && !Number.isNaN(Number(row[VALUE_COLUMN]));

interface ExemplarsQuery {
  readonly esql: string;
  readonly simulated: boolean;
}

/** Commands that filter or add columns without dropping `@timestamp`, so samples can be read the same way. */
const SAMPLEABLE_COMMANDS: ReadonlySet<string> = new Set(['from', 'where', 'eval']);

/**
 * The commands before the top-level `STATS`, so the samples go through the same filters as the chart.
 * `undefined` when the aggregation is nested (e.g. in `FORK`) or follows commands the samples can't go through.
 */
const getPreAggregationQuery = (esql: string): string | undefined => {
  const { root } = Parser.parse(esql);
  const statsIndex = root.commands.findIndex(({ name }) => name === 'stats');
  const preAggregationCommands = root.commands.slice(0, Math.max(statsIndex, 0));
  if (
    statsIndex < 1 ||
    !preAggregationCommands.every(({ name }) => SAMPLEABLE_COMMANDS.has(name))
  ) {
    return undefined;
  }
  return BasicPrettyPrinter.print({ ...root, commands: preAggregationCommands });
};

/**
 * Real exemplars come from `SET exemplars` on `TS ... | STATS` queries. Any other query gets
 * simulated exemplars: the largest raw samples of the aggregated field, renamed to `value` and
 * flagged with a `simulated_exemplar` column so the rows can be drawn and clicked as returned.
 */
export const getExemplarsQuery = (esql: string): ExemplarsQuery | undefined => {
  if (queryHasTsSourceCommand(esql)) {
    return { esql: `SET exemplars={"limit": ${EXEMPLARS_LIMIT}};\n${esql}`, simulated: false };
  }
  const [, field] = esql.match(AGGREGATED_FIELD_REGEX) ?? [];
  const preAggregationQuery = getPreAggregationQuery(esql);
  if (!field || !preAggregationQuery) {
    return undefined;
  }
  return {
    esql: [
      preAggregationQuery,
      `WHERE ${field} IS NOT NULL`,
      `SORT ${field} DESC`,
      `LIMIT ${SIMULATED_EXEMPLARS_LIMIT}`,
      `EVAL ${VALUE_COLUMN} = ${field}, ${SIMULATED_COLUMN} = true`,
    ].join('\n| '),
    simulated: true,
  };
};

interface CreateExemplarsOverlayProviderParams {
  readonly onExemplarClick: (exemplar: Exemplar) => void;
  /** Latest value of the feature flag; read on every chart load, so a change applies on the next reload. */
  readonly isEnabled: () => boolean;
}

/** Lens XY overlay provider drawing clickable exemplars on the XY charts of this example app, dashboards and Discover. */
export const createExemplarsOverlayProvider = ({
  onExemplarClick,
  isEnabled,
}: CreateExemplarsOverlayProviderParams): LensXYOverlayProvider => {
  return {
    id: EXEMPLARS_OVERLAY_PROVIDER_ID,
    isApplicable: ({ executionContext }, { esql }) => {
      return (
        isEnabled() &&
        executionContext?.type !== undefined &&
        SUPPORTED_SURFACE_TYPES.has(executionContext.type) &&
        queryHasStatsCommand(esql) &&
        getExemplarsQuery(esql) !== undefined
      );
    },

    fetchOverlay: async ({ layer, executeEsql }) => {
      const query = getExemplarsQuery(layer.esql);
      if (!query) {
        return undefined;
      }
      const title = query.simulated ? 'Simulated exemplars' : 'Exemplars';
      const { rows } = await executeEsql(query.esql, {
        title,
        description:
          'This request queries Elasticsearch to fetch the exemplars drawn on the chart.',
      });

      return {
        type: 'points',
        title,
        data: rows.filter(isDrawable),
        // ES|QL returns dates as ISO strings, while time charts expect milliseconds.
        xAccessor: getTimestamp,
        yAccessor: VALUE_COLUMN,
      };
    },
    onPointClick: ({ datum }) => {
      const { [SIMULATED_COLUMN]: simulated, ...fields } = datum;
      onExemplarClick({ simulated: simulated === true, fields });
    },
  };
};
