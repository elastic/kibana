/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface StartSyncArgs {
  connectorId: string;
  http?: HttpSetup;
}

export const startSync = async ({ connectorId, http }: StartSyncArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/start_sync`;
  return await http?.post(route);
};

export const StartSyncApiLogic = createApiLogic(['start_sync_api_logic'], startSync, {
  showSuccessFlashFn: () =>
    i18n.translate('xpack.contentConnectors.content.searchIndex.index.syncSuccess.message', {
      defaultMessage: 'Successfully scheduled a sync, waiting for a connector to pick it up',
    }),
});
