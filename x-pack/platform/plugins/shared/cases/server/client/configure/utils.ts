/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSyncSettings } from '../../../common/types/domain';

/**
 * Copies only the sync settings that are present, so absent keys stay absent
 * instead of becoming `undefined` values in saved objects and responses.
 */
export const pickConnectorSyncSettings = (
  source?: Partial<ConnectorSyncSettings> | null
): ConnectorSyncSettings => ({
  ...(source?.externalSync != null ? { externalSync: source.externalSync } : {}),
  ...(source?.externalSyncFields != null ? { externalSyncFields: source.externalSyncFields } : {}),
  ...(source?.externalSyncFieldMappings != null
    ? { externalSyncFieldMappings: source.externalSyncFieldMappings }
    : {}),
});
