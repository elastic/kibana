/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  getTextBasedLayerQueriesById,
  type LensExtension,
  type LensExtensionLayer,
  type LensExtensionMatchContext,
  type LensExtensionsRuntimeConfig,
  type MinimalLensAttributes,
} from '@kbn/lens-common';

export interface ActiveLensExtension {
  readonly extension: LensExtension;
  readonly layer: LensExtensionLayer;
}

interface GetExtensionMatchContextParams {
  readonly attributes: MinimalLensAttributes & { readonly visualizationType: string | null };
  readonly executionContext?: KibanaExecutionContext;
}

/** Builds the read-only view of a chart that extension rules are evaluated against. */
export const getExtensionMatchContext = ({
  attributes,
  executionContext,
}: GetExtensionMatchContextParams): LensExtensionMatchContext | undefined => {
  const { visualizationType } = attributes;
  if (!visualizationType) {
    return undefined;
  }
  const layers = Object.entries(getTextBasedLayerQueriesById(attributes)).map(
    ([layerId, { esql }]): LensExtensionLayer => ({ layerId, esql })
  );
  return { visualizationType, layers, executionContext };
};

const isApplicableSafely = (
  extension: LensExtension,
  context: LensExtensionMatchContext,
  layer: LensExtensionLayer
): boolean => {
  try {
    return extension.isApplicable(context, layer);
  } catch {
    return false;
  }
};

interface ResolveActiveExtensionsParams {
  readonly extensions: readonly LensExtension[];
  readonly context: LensExtensionMatchContext;
  readonly runtimeConfig?: LensExtensionsRuntimeConfig;
}

/** Returns every extension/layer pair whose rules match the chart, in registration order. */
export const resolveActiveExtensions = ({
  extensions,
  context,
  runtimeConfig,
}: ResolveActiveExtensionsParams): ActiveLensExtension[] =>
  extensions
    .filter(
      ({ id, visualizationTypes }) =>
        runtimeConfig?.[id] !== false && visualizationTypes.includes(context.visualizationType)
    )
    .flatMap((extension) =>
      context.layers
        .filter((layer) => isApplicableSafely(extension, context, layer))
        .map((layer) => ({ extension, layer }))
    );
