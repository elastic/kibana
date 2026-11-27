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

export interface XYOverlayTruncation {
  readonly providerId: string;
  readonly layerId: string;
  readonly pointCount: number;
}

export interface XYOverlaysRunResult {
  readonly overlays: readonly LensXYOverlay[];
  readonly failures: readonly XYOverlayProviderFailure[];
  /** Overlays that returned more than `MAX_XY_OVERLAY_POINTS` points and were cut to that limit. */
  readonly truncations: readonly XYOverlayTruncation[];
}

interface RunActiveProvidersParams {
  readonly activeProviders: readonly ActiveXYOverlayProvider[];
  readonly abortSignal: AbortSignal;
  readonly getFetchContext: (layer: LensXYOverlayLayer) => LensXYOverlayFetchContext;
}

/** Maximum number of points drawn per overlay; every point is an extra mark on the chart. */
export const MAX_XY_OVERLAY_POINTS = 1000;

export const toError = (reason: unknown): Error =>
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
    activeProviders.map(async ({ provider, layer }) => {
      const overlay = await provider.fetchOverlay(getFetchContext(layer));
      if (overlay && !Array.isArray(overlay.data)) {
        throw new Error(`The "${provider.id}" overlay has no data array`);
      }
      return overlay;
    })
  );

  if (abortSignal.aborted) {
    return { overlays: [], failures: [], truncations: [] };
  }

  const overlays: LensXYOverlay[] = [];
  const failures: XYOverlayProviderFailure[] = [];
  const truncations: XYOverlayTruncation[] = [];

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
    if (!result.value) {
      return;
    }
    const { data } = result.value;
    if (data.length > MAX_XY_OVERLAY_POINTS) {
      truncations.push({
        providerId: provider.id,
        layerId: layer.layerId,
        pointCount: data.length,
      });
    }
    overlays.push({
      ...result.value,
      data: data.slice(0, MAX_XY_OVERLAY_POINTS),
      providerId: provider.id,
      layerId: layer.layerId,
      clickable: provider.onPointClick !== undefined,
    });
  });

  return { overlays, failures, truncations };
};

/** Routes a click on an overlay point to the provider that owns it. */
export const dispatchOverlayPointClick = (
  registry: XYOverlayProviderRegistry,
  event: LensXYOverlayPointClickEvent
): void => {
  registry.get(event.providerId)?.onPointClick?.(event);
};
