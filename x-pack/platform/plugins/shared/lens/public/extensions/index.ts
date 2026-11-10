/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createLensExtensionRegistry } from './extension_registry';
export type { LensExtensionRegistry } from './extension_registry';
export { getExtensionMatchContext, resolveActiveExtensions } from './resolve_active_extensions';
export type { ActiveLensExtension } from './resolve_active_extensions';
export { runActiveExtensions, dispatchOverlayPointClick } from './run_active_extensions';
export type { LensExtensionFailure, LensExtensionsRunResult } from './run_active_extensions';
export { loadExtensionOverlays } from './load_extension_overlays';
export { getExtensionFailureMessage } from './extension_failure_message';
