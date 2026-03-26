/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import type { HttpSetup } from '@kbn/core/public';
import type { Actions } from '../api_logic/create_api_logic';
import { createApiLogic } from '../api_logic/create_api_logic';
import type { DeleteConnectorResponse } from '../../../common/types/connectors';

export interface DeleteConnectorApiLogicArgs {
  connectorId: string;
  connectorName: string;
  shouldDeleteIndex: boolean;
  http?: HttpSetup;
}

export interface DeleteConnectorApiLogicResponse {
  connectorName: string;
}

export const deleteConnector = async ({
  connectorId,
  connectorName,
  shouldDeleteIndex = false,
  http,
}: DeleteConnectorApiLogicArgs): Promise<DeleteConnectorApiLogicResponse> => {
  await http?.delete(`/internal/content_connectors/connectors/${connectorId}`, {
    query: {
      shouldDeleteIndex,
    },
  });
  return { connectorName };
};

export const DeleteConnectorApiLogic = createApiLogic(
  ['delete_connector_api_logic'],
  deleteConnector,
  {
    showSuccessFlashFn: ({ connectorName }) =>
      i18n.translate(
        'xpack.contentConnectors.content.connectors.deleteConnector.successToast.title',
        {
          defaultMessage: 'The connector {connectorName} was successfully deleted',
          values: {
            connectorName,
          },
        }
      ),
  }
);

export type DeleteConnectorApiLogicActions = Actions<
  DeleteConnectorApiLogicArgs,
  DeleteConnectorResponse
>;
