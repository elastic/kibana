/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  getTextBasedLayerQueriesById,
  type LensXYOverlayProvider,
  type LensXYOverlayLayer,
  type LensXYOverlayMatchContext,
  type LensXYOverlayProvidersConfig,
  type MinimalLensAttributes,
} from '@kbn/lens-common';
import { toError, type XYOverlayProviderFailure } from './run_active_providers';

export interface ActiveXYOverlayProvider {
  readonly provider: LensXYOverlayProvider;
  readonly layer: LensXYOverlayLayer;
}

/** Only XY charts render overlays, so providers are never evaluated on other visualizations. */
const OVERLAY_VISUALIZATION_TYPE = 'lnsXY';

interface GetXYOverlayMatchContextParams {
  readonly attributes: MinimalLensAttributes & { readonly visualizationType: string | null };
  readonly executionContext?: KibanaExecutionContext;
}

/** Builds the read-only view of an XY chart that provider rules are evaluated against. */
export const getXYOverlayMatchContext = ({
  attributes,
  executionContext,
}: GetXYOverlayMatchContextParams): LensXYOverlayMatchContext | undefined => {
  if (attributes.visualizationType !== OVERLAY_VISUALIZATION_TYPE) {
    return undefined;
  }
  const layers = Object.entries(getTextBasedLayerQueriesById(attributes)).map(
    ([layerId, { esql }]): LensXYOverlayLayer => ({ layerId, esql })
  );
  return { layers, executionContext };
};

interface ResolveActiveProvidersParams {
  readonly providers: readonly LensXYOverlayProvider[];
  readonly context: LensXYOverlayMatchContext;
  readonly runtimeConfig?: LensXYOverlayProvidersConfig;
}

export interface ResolvedXYOverlayProviders {
  readonly activeProviders: ActiveXYOverlayProvider[];
  /** Providers whose `isApplicable` threw; they are skipped for that layer. */
  readonly failures: XYOverlayProviderFailure[];
}

/** Returns every provider/layer pair whose rules match the chart, in registration order. */
export const resolveActiveProviders = ({
  providers,
  context,
  runtimeConfig,
}: ResolveActiveProvidersParams): ResolvedXYOverlayProviders => {
  const activeProviders: ActiveXYOverlayProvider[] = [];
  const failures: XYOverlayProviderFailure[] = [];

  for (const provider of providers) {
    if (runtimeConfig?.[provider.id] === false) {
      continue;
    }
    for (const layer of context.layers) {
      try {
        if (provider.isApplicable(context, layer)) {
          activeProviders.push({ provider, layer });
        }
      } catch (error) {
        failures.push({ providerId: provider.id, layerId: layer.layerId, error: toError(error) });
      }
    }
  }

  return { activeProviders, failures };
};
