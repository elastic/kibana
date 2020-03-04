/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

// @ts-ignore: allow traversal to fail on x-pack build
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

export type NpCore = typeof npStart.core;
export type NpPlugins = typeof npStart.plugins;

// AppCore/AppPlugins is the set of core features/plugins
// we pass on via context/hooks to the app and its components.
export type AppCore = Pick<
  ShimCore,
  | 'chrome'
  | 'docLinks'
  | 'http'
  | 'i18n'
  | 'injectedMetadata'
  | 'savedObjects'
  | 'uiSettings'
  | 'overlays'
  | 'notifications'
>;
export type AppPlugins = Pick<ShimPlugins, 'data' | 'management'>;

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export type ShimCore = NpCore;

export type ShimPlugins = NpPlugins;

export function createPublicShim(): { core: ShimCore; plugins: ShimPlugins } {
  return {
    core: {
      ...npStart.core,
    },
    plugins: {
      ...npStart.plugins,
    },
  };
}
