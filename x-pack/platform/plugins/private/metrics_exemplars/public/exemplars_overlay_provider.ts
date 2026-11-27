/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlQuery, isFunctionExpression, isIdentifier } from '@elastic/esql';
import type { ChromeStart, KibanaExecutionContext } from '@kbn/core/public';
import { SettingNames } from '@kbn/esql-language';
import { i18n } from '@kbn/i18n';
import {
  queryHasStatsCommand,
  queryHasTsSourceCommand,
  type LensXYOverlayDatum,
  type LensXYOverlayProvider,
} from '@kbn/lens-common';

export const EXEMPLARS_OVERLAY_PROVIDER_ID = 'metricsExemplars.exemplars';
export const EXEMPLARS_FEATURE_FLAG = 'observability.metricsExemplarsEnabled';

/**
 * Surfaces drawing exemplars, matched on the `executionContext` Lens passes to providers.
 * An entry without `name` matches any name of that type.
 */
const SUPPORTED_SURFACES: ReadonlyArray<Pick<KibanaExecutionContext, 'type' | 'name'>> = [
  { type: 'application', name: 'discover' },
  { type: 'dashboard' },
];

type ActiveSolution = ReturnType<ChromeStart['getActiveSolutionNavId']>;

const SUPPORTED_SOLUTIONS: readonly ActiveSolution[] = ['oblt'];

const EXEMPLARS_LIMIT = 1000;
const TIMESTAMP_COLUMN = '@timestamp';
const VALUE_COLUMN = 'value';

const OVERLAY_TITLE = i18n.translate('xpack.metricsExemplars.overlayTitle', {
  defaultMessage: 'Exemplars',
});
const REQUEST_DESCRIPTION = i18n.translate('xpack.metricsExemplars.requestDescription', {
  defaultMessage: 'This request queries Elasticsearch to fetch the exemplars drawn on the chart.',
});

// TODO: Move to a shared package so code outside this plugin can use it.
export interface Exemplar {
  readonly timestamp: string;
  readonly value: number;
  readonly fields: Readonly<Record<string, unknown>>;
}

const getTimestamp = (row: LensXYOverlayDatum): number => Date.parse(String(row[TIMESTAMP_COLUMN]));

const isDrawable = (row: LensXYOverlayDatum): boolean =>
  !Number.isNaN(getTimestamp(row)) && !Number.isNaN(Number(row[VALUE_COLUMN]));

const isSupportedSurface = (executionContext?: KibanaExecutionContext): boolean =>
  SUPPORTED_SURFACES.some(
    ({ type, name }) =>
      executionContext?.type === type && (name === undefined || executionContext?.name === name)
  );

/** A query already setting `exemplars` returns exemplars itself, and a second `SET exemplars` would override ours. */
const hasExemplarsSetting = (esql: string): boolean =>
  (EsqlQuery.fromSrc(esql).ast.header ?? []).some((instruction) =>
    instruction.args.some(
      (setting) =>
        isFunctionExpression(setting) &&
        setting.args.some((arg) => isIdentifier(arg) && arg.name === SettingNames.EXEMPLARS)
    )
  );

/** Elasticsearch only returns exemplars for `TS ... | STATS` queries. */
export const isExemplarsQuery = (esql: string): boolean =>
  queryHasTsSourceCommand(esql) && queryHasStatsCommand(esql) && !hasExemplarsSetting(esql);

export const getExemplarsQuery = (esql: string): string =>
  `SET ${SettingNames.EXEMPLARS}={"limit": ${EXEMPLARS_LIMIT}};\n${esql}`;

interface CreateExemplarsOverlayProviderParams {
  /** Latest value of the feature flag; read on every chart load, so a change applies on the next reload. */
  readonly isEnabled: () => boolean;
  readonly getActiveSolution: () => ActiveSolution;
  readonly onExemplarClick: (exemplar: Exemplar) => void;
}

export const createExemplarsOverlayProvider = ({
  isEnabled,
  getActiveSolution,
  onExemplarClick,
}: CreateExemplarsOverlayProviderParams): LensXYOverlayProvider => {
  return {
    id: EXEMPLARS_OVERLAY_PROVIDER_ID,
    isApplicable: ({ executionContext }, { esql }) =>
      isEnabled() &&
      SUPPORTED_SOLUTIONS.includes(getActiveSolution()) &&
      isSupportedSurface(executionContext) &&
      isExemplarsQuery(esql),

    fetchOverlay: async ({ layer, executeEsql }) => {
      const { rows } = await executeEsql(getExemplarsQuery(layer.esql), {
        title: OVERLAY_TITLE,
        description: REQUEST_DESCRIPTION,
      });

      return {
        type: 'points',
        title: OVERLAY_TITLE,
        data: rows.filter(isDrawable),
        // ES|QL returns dates as ISO strings, while time charts expect milliseconds.
        xAccessor: getTimestamp,
        yAccessor: VALUE_COLUMN,
      };
    },

    onPointClick: ({ datum }) => {
      onExemplarClick({
        timestamp: String(datum[TIMESTAMP_COLUMN]),
        value: Number(datum[VALUE_COLUMN]),
        fields: datum,
      });
    },
  };
};
