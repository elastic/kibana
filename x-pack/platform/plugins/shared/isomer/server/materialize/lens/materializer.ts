/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath, SavedObjectReference } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import type { Materializer } from '../types';
import { openInLensLabel } from './shared';
import { mapLensDatatable } from './datatable';
import { mapLensHeatmap } from './heatmap';
import { mapLensMetric } from './metric';
import { mapLensPartition } from './partition';
import { asMappedChart, planLensChart } from './plan';
import type { LensApiConfig, LensMaterializeConfig, LensSavedObjectReference } from './types';
import { mapLensXy } from './xy';

/** The saved object type, and embeddable type, of Lens charts. */
export const LENS_TYPE = 'lens';

/** Bump when the nodes the Lens materializer produces change. */
const LENS_MATERIALIZER_VERSION = 2;

/** Lens's server `transformOut`: stored panel state to Lens's API format. */
export type LensTransformOut = (
  state: { attributes: Record<string, unknown> },
  references?: SavedObjectReference[]
) => unknown;

export interface LensMaterializerDeps {
  /** Lens's registered embeddable `transformOut`, when Lens is enabled. */
  getTransformOut: () => LensTransformOut | undefined;
  basePath: Pick<IBasePath, 'get'>;
}

// A by-reference load marks its result with a symbol, which no by-value config from JSON can
// carry, so only a loaded chart links back to a saved object.
const LOADED = Symbol('isomer.lens.loaded');

interface LoadedLensChart {
  [LOADED]: LensSavedObjectReference;
  chart: unknown;
}

const isLoaded = (config: unknown): config is LoadedLensChart =>
  typeof config === 'object' && config !== null && LOADED in config;

const invalidConfig = (problem: string) =>
  new Error(
    i18n.translate('xpack.isomer.materialize.lens.invalidConfig', {
      defaultMessage: 'It is not a chart in Lens API format: {problem}',
      values: { problem },
    })
  );

const parseChart = (config: unknown): LensApiConfig => {
  let result: ReturnType<typeof lensApiConfigSchema.safeParse>;
  try {
    result = lensApiConfigSchema.safeParse(config);
  } catch (error) {
    // Some of Lens's refinements assume an earlier check passed, and throw instead.
    throw invalidConfig(error instanceof Error ? error.message : String(error));
  }
  if (result.success) {
    return result.data;
  }
  const [issue] = result.error.issues;
  throw invalidConfig(issue ? `${issue.path.join('.') || 'config'}: ${issue.message}` : '');
};

/** Materializes Lens charts, by reference or by value, from Lens's API format. */
export const createLensMaterializer = ({
  getTransformOut,
  basePath,
}: LensMaterializerDeps): Materializer<LensMaterializeConfig> => ({
  version: LENS_MATERIALIZER_VERSION,

  parse: (config) =>
    isLoaded(config)
      ? { chart: parseChart(config.chart), savedObject: config[LOADED] }
      : { chart: parseChart(config) },

  load: async (id, { request, savedObjectsClient }) => {
    const transformOut = getTransformOut();
    if (!transformOut) {
      throw new Error(
        i18n.translate('xpack.isomer.materialize.lens.unavailable', {
          defaultMessage: 'Lens is not available in this Kibana.',
        })
      );
    }
    const { attributes, references } = await savedObjectsClient.get<Record<string, unknown>>(
      LENS_TYPE,
      id
    );
    const chart = transformOut({ attributes: { ...attributes, references } }, references);
    const loaded: LoadedLensChart = {
      [LOADED]: {
        id,
        path: `${basePath.get(request)}/app/lens#/edit/${encodeURIComponent(id)}`,
      },
      chart,
    };
    return loaded;
  },

  describe: ({ chart, savedObject }) => ({
    ...(chart.title ? { title: chart.title } : {}),
    ...(savedObject
      ? {
          link: {
            href: savedObject.path,
            label: openInLensLabel(),
          },
        }
      : {}),
  }),

  plan: ({ chart }, context) => planLensChart(chart, context),

  map: ({ chart, savedObject }, { tables }, kit) => {
    const mapped = asMappedChart(chart);
    if ('type' in mapped) {
      return mapped;
    }
    if ('xy' in mapped) {
      return mapLensXy(mapped.xy, tables, kit, savedObject);
    }
    const { single } = mapped;
    switch (single.type) {
      case 'metric':
        return mapLensMetric(single, tables, kit, savedObject);
      case 'data_table':
        return mapLensDatatable(single, tables, kit, savedObject);
      case 'pie':
      case 'treemap':
      case 'mosaic':
      case 'waffle':
        return mapLensPartition(single, tables, kit, savedObject);
      case 'heatmap':
        return mapLensHeatmap(single, tables, kit, savedObject);
    }
  },
});
