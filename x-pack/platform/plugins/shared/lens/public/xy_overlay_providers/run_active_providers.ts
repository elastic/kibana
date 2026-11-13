/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensXYOverlayFetchContext,
  LensXYOverlayLayer,
  LensXYOverlay,
  LensXYOverlayPointClickEvent,
} from '@kbn/lens-common';
import type { ActiveXYOverlayProvider } from './resolve_active_providers';
import type { XYOverlayProviderRegistry } from './provider_registry';

export interface XYOverlayProviderFailure {
  readonly providerId: string;
  readonly layerId: string;
  readonly error: Error;
}

export interface XYOverlaysRunResult {
  readonly overlays: readonly LensXYOverlay[];
  readonly failures: readonly XYOverlayProviderFailure[];
}

interface RunActiveProvidersParams {
  readonly activeProviders: readonly ActiveXYOverlayProvider[];
  readonly abortSignal: AbortSignal;
  readonly getFetchContext: (layer: LensXYOverlayLayer) => LensXYOverlayFetchContext;
}

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

/**
 * Fetches all active overlays independently of the base chart and of each other:
 * a failing provider is reported in `failures` and never rejects the whole run.
 */
export const runActiveProviders = async ({
  activeProviders,
  abortSignal,
  getFetchContext,
}: RunActiveProvidersParams): Promise<XYOverlaysRunResult> => {
  const settled = await Promise.allSettled(
    activeProviders.map(({ provider, layer }) => provider.fetchOverlay(getFetchContext(layer)))
  );

  if (abortSignal.aborted) {
    return { overlays: [], failures: [] };
  }

  const overlays: LensXYOverlay[] = [];
  const failures: XYOverlayProviderFailure[] = [];

  settled.forEach((result, index) => {
    const { provider, layer } = activeProviders[index];
    if (result.status === 'rejected') {
      failures.push({
        providerId: provider.id,
        layerId: layer.layerId,
        error: toError(result.reason),
      });
      return;
    }
    if (result.value) {
      overlays.push({ ...result.value, providerId: provider.id, layerId: layer.layerId });
    }
  });

  return { overlays, failures };
};

/** Routes a click on an overlay point to the provider that owns it. */
export const dispatchOverlayPointClick = (
  registry: XYOverlayProviderRegistry,
  event: LensXYOverlayPointClickEvent
): void => {
  registry.get(event.providerId)?.onPointClick?.(event);
};
