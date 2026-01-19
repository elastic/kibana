/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { type APMSourcesAccessConfig, configSchema } from '../common/config_schema';

/**
 * Plugin configuration for the apm_sources_access.
 */
export const config: PluginConfigDescriptor<APMSourcesAccessConfig> = {
  deprecations: ({ renameFromRoot, deprecate }) => [
    // deprecations
    deprecate('indices.sourcemap', 'a future version', {
      level: 'warning',
      message: `Configuring "xpack.apm.indices.sourcemap" is deprecated and will be removed in a future version. Please remove this setting.`,
    }),

    deprecate('indices.onboarding', 'a future version', {
      level: 'warning',
      message: `Configuring "xpack.apm.indices.onboarding" is deprecated and will be removed in a future version. Please remove this setting.`,
    }),

    // deprecations due to removal of apm_oss plugin
    renameFromRoot('apm_oss.transactionIndices', 'xpack.apm.indices.transaction', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.onboardingIndices', 'xpack.apm.indices.onboarding', {
      level: 'warning',
    }),

    // rename from apm to apm_sources_access plugin
    renameFromRoot(
      'xpack.apm.indices.transaction',
      'xpack.apm_sources_access.indices.transaction',
      {
        level: 'warning',
        silent: true,
      }
    ),
    renameFromRoot('xpack.apm.indices.span', 'xpack.apm_sources_access.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.error', 'xpack.apm_sources_access.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.metric', 'xpack.apm_sources_access.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.sourcemap', 'xpack.apm_sources_access.indices.sourcemap', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.onboarding', 'xpack.apm_sources_access.indices.onboarding', {
      level: 'warning',
    }),

    // rename from apm_data_access to apm_sources_access plugin
    renameFromRoot(
      'xpack.apm_data_access.indices.transaction',
      'xpack.apm_sources_access.indices.transaction',
      {
        level: 'warning',
        silent: true,
      }
    ),
    renameFromRoot('xpack.apm_data_access.indices.span', 'xpack.apm_sources_access.indices.span', {
      level: 'warning',
    }),
    renameFromRoot(
      'xpack.apm_data_access.indices.error',
      'xpack.apm_sources_access.indices.error',
      {
        level: 'warning',
      }
    ),
    renameFromRoot(
      'xpack.apm_data_access.indices.metric',
      'xpack.apm_sources_access.indices.metric',
      {
        level: 'warning',
      }
    ),
    renameFromRoot(
      'xpack.apm_data_access.indices.sourcemap',
      'xpack.apm_sources_access.indices.sourcemap',
      {
        level: 'warning',
      }
    ),
    renameFromRoot(
      'xpack.apm_data_access.indices.onboarding',
      'xpack.apm_sources_access.indices.onboarding',
      {
        level: 'warning',
      }
    ),
  ],

  schema: configSchema,
};
