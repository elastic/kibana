/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface StartAccessControlSyncArgs {
  connectorId: string;
  http?: HttpSetup;
}

export const startAccessControlSync = async ({ connectorId, http }: StartAccessControlSyncArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/start_access_control_sync`;
  return await http?.post(route);
};

export const StartAccessControlSyncApiLogic = createApiLogic(
  ['start_access_control_sync_api_logic'],
  startAccessControlSync,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.searchIndex.index.accessControlSyncSuccess.message',
        {
          defaultMessage:
            'Successfully scheduled an access control sync, waiting for a connector to pick it up',
        }
      ),
  }
);
