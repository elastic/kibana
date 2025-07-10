/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ConnectorConfiguration } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface PostConnectorConfigurationArgs {
  configuration: Record<string, string | number | boolean | null>;
  connectorId: string;
  http?: HttpSetup;
}

export interface PostConnectorConfigurationResponse {
  configuration: ConnectorConfiguration;
}

export const postConnectorConfiguration = async ({
  configuration,
  connectorId,
  http,
}: PostConnectorConfigurationArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/configuration`;

  const responseConfig = await http?.post<ConnectorConfiguration>(route, {
    body: JSON.stringify(configuration),
  });
  return { configuration: responseConfig };
};

export const ConnectorConfigurationApiLogic = createApiLogic(
  ['content', 'configuration_connector_api_logic'],
  postConnectorConfiguration,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.indices.configurationConnector.configuration.successToast.title',
        { defaultMessage: 'Configuration updated' }
      ),
  }
);

export type PostConnectorConfigurationActions = Actions<
  PostConnectorConfigurationArgs,
  PostConnectorConfigurationResponse
>;
