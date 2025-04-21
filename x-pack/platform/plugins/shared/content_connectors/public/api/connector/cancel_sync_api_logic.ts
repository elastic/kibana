/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface CancelSyncApiArgs {
  syncJobId: string;
  http?: HttpSetup;
}

export interface CancelSyncApiResponse {
  success: boolean;
}

export const cancelSync = async ({ syncJobId, http }: CancelSyncApiArgs) => {
  const route = `/internal/content_connectors/connectors/${syncJobId}/cancel_sync`;
  return await http?.put(route);
};

export const CancelSyncApiLogic = createApiLogic(['cancel_sync_api_logic'], cancelSync, {
  showErrorFlash: true,
  showSuccessFlashFn: () =>
    i18n.translate('xpack.contentConnectors.content.searchIndex.cancelSync.successMessage', {
      defaultMessage: 'Successfully canceled sync',
    }),
});

export type CancelSyncApiActions = Actions<CancelSyncApiArgs, CancelSyncApiResponse>;
