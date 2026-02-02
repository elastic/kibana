/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SyncStatus } from '../../../common/types';

const RemoteSyncedIntegrationsBaseSchema = schema.object({
  id: schema.maybe(schema.string()),
  package_name: schema.maybe(schema.string()),
  package_version: schema.maybe(schema.string()),
});

export const RemoteSyncedIntegrationsStatusSchema = RemoteSyncedIntegrationsBaseSchema.extends({
  sync_status: schema.oneOf([
    schema.literal(SyncStatus.COMPLETED),
    schema.literal(SyncStatus.SYNCHRONIZING),
    schema.literal(SyncStatus.FAILED),
    schema.literal(SyncStatus.WARNING),
  ]),
  error: schema.maybe(schema.string()),
  warning: schema.maybe(
    schema.object({
      title: schema.string(),
      message: schema.maybe(schema.string()),
    })
  ),
  updated_at: schema.maybe(schema.string()),
  install_status: schema.object({
    main: schema.string(),
    remote: schema.maybe(schema.string()),
  }),
});

export const CustomAssetsDataSchema = schema.object({
  type: schema.string(),
  name: schema.string(),
  package_name: schema.string(),
  package_version: schema.string(),
  sync_status: schema.oneOf([
    schema.literal(SyncStatus.COMPLETED),
    schema.literal(SyncStatus.SYNCHRONIZING),
    schema.literal(SyncStatus.FAILED),
    schema.literal(SyncStatus.WARNING),
  ]),
  error: schema.maybe(schema.string()),
  is_deleted: schema.maybe(schema.boolean()),
  warning: schema.maybe(
    schema.object({
      title: schema.string(),
      message: schema.maybe(schema.string()),
    })
  ),
});

export const GetRemoteSyncedIntegrationsStatusResponseSchema = schema.object({
  integrations: schema.arrayOf(RemoteSyncedIntegrationsStatusSchema, { maxSize: 10000 }),
  custom_assets: schema.maybe(schema.recordOf(schema.string(), CustomAssetsDataSchema)),
  error: schema.maybe(schema.string()),
  warning: schema.maybe(
    schema.object({
      title: schema.string(),
      message: schema.maybe(schema.string()),
    })
  ),
});
