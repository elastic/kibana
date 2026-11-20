/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlQuery, isFunctionExpression, isIdentifier } from '@elastic/esql';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { SettingNames } from '@kbn/esql-language';
import { i18n } from '@kbn/i18n';
import {
  queryHasStatsCommand,
  queryHasTsSourceCommand,
  type LensXYOverlayPoint,
  type LensXYOverlayProvider,
} from '@kbn/lens-common';

export const EXEMPLARS_OVERLAY_PROVIDER_ID = 'metricsExemplars.exemplars';
export const EXEMPLARS_FEATURE_FLAG = 'observability.metricsExemplarsEnabled';

/**
 * Surfaces drawing exemplars, matched on the `executionContext` each one passes to Lens.
 * An entry without `name` matches any name of that type.
 */
const SUPPORTED_SURFACES: ReadonlyArray<Pick<KibanaExecutionContext, 'type' | 'name'>> = [
  { type: 'discover', name: 'metrics_grid' },
  { type: 'discover', name: 'unified_histogram' },
  { type: 'dashboard' },
];

const EXEMPLARS_LIMIT = 1000;

const OVERLAY_TITLE = i18n.translate('xpack.metricsExemplars.overlayTitle', {
  defaultMessage: 'Exemplars',
});
const REQUEST_DESCRIPTION = i18n.translate('xpack.metricsExemplars.requestDescription', {
  defaultMessage: 'This request queries Elasticsearch to fetch the exemplars drawn on the chart.',
});

// TODO: Move to a shared package so code outside this plugin can use it.
export interface Exemplar {
  readonly id: string;
  readonly timestamp: string;
  readonly value: number;
  readonly fields: Readonly<Record<string, unknown>>;
}

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
  readonly onExemplarClick: (exemplar: Exemplar) => void;
}

export const createExemplarsOverlayProvider = ({
  isEnabled,
  onExemplarClick,
}: CreateExemplarsOverlayProviderParams): LensXYOverlayProvider => {
  /**
   * Temporary: clicks only carry the point id, so fetched exemplars are kept to resolve them.
   * The overlay API will return the whole exemplar payload on click, removing this lookup.
   */
  const exemplarsById = new Map<string, Exemplar>();
  let nextId = 0;

  return {
    id: EXEMPLARS_OVERLAY_PROVIDER_ID,
    isApplicable: ({ executionContext }, { esql }) =>
      isEnabled() &&
      isSupportedSurface(executionContext) &&
      esql !== undefined &&
      isExemplarsQuery(esql),

    fetchOverlay: async ({ layer, executeEsql }) => {
      if (!layer.esql) {
        return undefined;
      }
      const { rows } = await executeEsql(getExemplarsQuery(layer.esql), {
        title: OVERLAY_TITLE,
        description: REQUEST_DESCRIPTION,
      });

      const points = rows.flatMap((row): LensXYOverlayPoint[] => {
        const timestamp = String(row['@timestamp']);
        const x = Date.parse(timestamp);
        const value = Number(row.value);
        if (Number.isNaN(x) || Number.isNaN(value)) {
          return [];
        }
        const id = `exemplar-${nextId++}`;
        exemplarsById.set(id, { id, timestamp, value, fields: row });
        return [{ id, x, y: value }];
      });

      return { type: 'points', title: OVERLAY_TITLE, points };
    },

    onPointClick: ({ pointId }) => {
      const exemplar = exemplarsById.get(pointId);
      if (exemplar) {
        onExemplarClick(exemplar);
      }
    },
  };
};
