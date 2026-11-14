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

const isApplicableSafely = (
  provider: LensXYOverlayProvider,
  context: LensXYOverlayMatchContext,
  layer: LensXYOverlayLayer
): boolean => {
  try {
    return provider.isApplicable(context, layer);
  } catch {
    return false;
  }
};

interface ResolveActiveProvidersParams {
  readonly providers: readonly LensXYOverlayProvider[];
  readonly context: LensXYOverlayMatchContext;
  readonly runtimeConfig?: LensXYOverlayProvidersConfig;
}

/** Returns every provider/layer pair whose rules match the chart, in registration order. */
export const resolveActiveProviders = ({
  providers,
  context,
  runtimeConfig,
}: ResolveActiveProvidersParams): ActiveXYOverlayProvider[] =>
  providers
    .filter(({ id }) => runtimeConfig?.[id] !== false)
    .flatMap((provider) =>
      context.layers
        .filter((layer) => isApplicableSafely(provider, context, layer))
        .map((layer) => ({ provider, layer }))
    );
