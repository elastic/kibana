/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * Static enablement switch. Defaults to `false` while the Notifications
   * Center is incubating, so the plugin is opt-in: core skips it entirely —
   * neither the server nor the browser plugin is instantiated — until a
   * deployment sets `xpack.notificationsCenter.enabled: true`. Once enabled,
   * the feature flags govern dynamic, per-deployment rollout.
   */
  enabled: schema.boolean({ defaultValue: false }),
});

export type NotificationsCenterConfig = TypeOf<typeof configSchema>;
