/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensExtensionFetchContext,
  LensExtensionOverlay,
  LensOverlayPointClickEvent,
} from '@kbn/lens-common';
import type { ActiveLensExtension } from './resolve_active_extensions';
import type { LensExtensionRegistry } from './extension_registry';

export interface LensExtensionFailure {
  readonly extensionId: string;
  readonly layerId: string;
  readonly error: Error;
}

export interface LensExtensionsRunResult {
  readonly overlays: readonly LensExtensionOverlay[];
  readonly failures: readonly LensExtensionFailure[];
}

interface RunActiveExtensionsParams {
  readonly activeExtensions: readonly ActiveLensExtension[];
  readonly fetchContext: Omit<LensExtensionFetchContext, 'layer'>;
}

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

/**
 * Fetches all active overlays independently of the base chart and of each other:
 * a failing extension is reported in `failures` and never rejects the whole run.
 */
export const runActiveExtensions = async ({
  activeExtensions,
  fetchContext,
}: RunActiveExtensionsParams): Promise<LensExtensionsRunResult> => {
  const settled = await Promise.allSettled(
    activeExtensions.map(({ extension, layer }) =>
      extension.fetchOverlay({ ...fetchContext, layer })
    )
  );

  if (fetchContext.abortSignal.aborted) {
    return { overlays: [], failures: [] };
  }

  const overlays: LensExtensionOverlay[] = [];
  const failures: LensExtensionFailure[] = [];

  settled.forEach((result, index) => {
    const { extension, layer } = activeExtensions[index];
    if (result.status === 'rejected') {
      failures.push({
        extensionId: extension.id,
        layerId: layer.layerId,
        error: toError(result.reason),
      });
      return;
    }
    if (result.value) {
      overlays.push({ ...result.value, extensionId: extension.id, layerId: layer.layerId });
    }
  });

  return { overlays, failures };
};

/** Routes a click on an overlay point to the extension that owns it. */
export const dispatchOverlayPointClick = (
  registry: LensExtensionRegistry,
  event: LensOverlayPointClickEvent
): void => {
  registry.get(event.extensionId)?.onPointClick?.(event);
};
