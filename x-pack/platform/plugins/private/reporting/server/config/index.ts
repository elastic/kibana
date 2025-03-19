/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from '@kbn/core/server';
import { ConfigSchema, ReportingConfigType } from '@kbn/reporting-server';

export const config: PluginConfigDescriptor<ReportingConfigType> = {
  exposeToBrowser: {
    csv: { scroll: true },
    poll: true,
    export_types: true,
    statefulSettings: true,
  },
  schema: ConfigSchema,
  deprecations: ({ unused }) => [
    unused('csv.enablePanelActionDownload', { level: 'warning' }), // unused since 9.0
    unused('roles.enabled', { level: 'warning' }), // unused since 9.0
    unused('roles.allow', { level: 'warning' }), // unused since 9.0
    unused('queue.indexInterval', { level: 'warning' }), // unused since 8.15
    unused('capture.browser.chromium.maxScreenshotDimension', { level: 'warning' }), // unused since 7.8
    unused('capture.browser.type', { level: 'warning' }),
    unused('poll.jobCompletionNotifier.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('poll.jobsRefresh.intervalErrorMultiplier', { level: 'warning' }), // unused since 7.10
    unused('capture.viewport', { level: 'warning' }), // deprecated as unused since 7.16
  ],
  exposeToUsage: {
    capture: { maxAttempts: true },
    csv: {
      maxSizeBytes: true,
      scroll: { size: true, duration: true },
    },
    kibanaServer: false, // show as [redacted]
    queue: { indexInterval: true, pollEnabled: true, timeout: true },
  },
};

export { createConfig } from './create_config';
export { registerUiSettings } from './ui_settings';
export { ConfigSchema };
