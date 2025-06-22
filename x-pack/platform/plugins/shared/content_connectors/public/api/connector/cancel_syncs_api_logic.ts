/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface CancelSyncsApiArgs {
  connectorId: string;
  http?: HttpSetup;
}

export const cancelSyncs = async ({ connectorId, http }: CancelSyncsApiArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/cancel_syncs`;
  return await http?.post(route);
};

export const CancelSyncsApiLogic = createApiLogic(['cancel_syncs_api_logic'], cancelSyncs, {
  showSuccessFlashFn: () =>
    i18n.translate('xpack.contentConnectors.content.searchIndex.cancelSyncs.successMessage', {
      defaultMessage: 'Successfully canceled syncs',
    }),
});

export type CancelSyncsActions = Actions<CancelSyncsApiArgs, {}>;
