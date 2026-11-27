/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object(
  {
    enabled: schema.boolean({ defaultValue: false }),
    /** Directory holding the resource files, for example a mounted volume. */
    path: schema.maybe(schema.string({ minLength: 1, maxLength: 4096 })),
    /** Marks created resources as managed; `dashboard` and `space` ignore it. */
    managed: schema.boolean({ defaultValue: true }),
    /** When `false`, skips files whose hash matches the last `completed` run. */
    reapplyOnStart: schema.boolean({ defaultValue: true }),
    /** Deletes resources the bootstrap created once they leave the files. */
    prune: schema.boolean({ defaultValue: false }),
    /** Task Manager timeout for one run. */
    timeout: schema.duration({ defaultValue: '10m', min: '10s', max: '2h' }),
    /** Task Manager attempts per run. */
    maxAttempts: schema.number({ defaultValue: 3, min: 1, max: 100 }),
    /** Maximum size of a single file. */
    maxFileSize: schema.byteSize({ defaultValue: '10mb', max: '100mb' }),
    /** Maximum size of all files together, which are held in memory. */
    maxTotalSize: schema.byteSize({ defaultValue: '50mb', max: '500mb' }),
    /** Maximum number of files. */
    maxFiles: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
  },
  {
    validate: ({ enabled, path, maxFileSize, maxTotalSize }) => {
      if (enabled && !path) {
        return '[path]: is required when the resource bootstrap is enabled';
      }
      if (maxFileSize.isGreaterThan(maxTotalSize)) {
        return '[maxFileSize]: must not exceed [maxTotalSize]';
      }
    },
  }
);

export type ResourceBootstrapConfig = TypeOf<typeof configSchema>;

/** The config of an enabled plugin, whose `path` the schema requires. */
export type EnabledResourceBootstrapConfig = ResourceBootstrapConfig & { path: string };

export const config: PluginConfigDescriptor<ResourceBootstrapConfig> = {
  schema: configSchema,
};
