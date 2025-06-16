/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { Connector } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export type PutConnectorNameAndDescriptionArgs = Partial<
  Pick<Connector, 'name' | 'description'>
> & {
  connectorId: string;
  http?: HttpSetup;
};

export type PutConnectorNameAndDescriptionResponse = Pick<Connector, 'name' | 'description'>;

export const putConnectorNameAndDescription = async ({
  connectorId,
  http,
  description = null,
  name = '',
}: PutConnectorNameAndDescriptionArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/name_and_description`;

  await http?.put(route, {
    body: JSON.stringify({ description, name }),
  });
  return { description, name };
};

export const ConnectorNameAndDescriptionApiLogic = createApiLogic(
  ['content', 'connector_name_and_description_api_logic'],
  putConnectorNameAndDescription,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.indices.configurationConnector.nameAndDescription.successToast.title',
        { defaultMessage: 'Connector name and description updated' }
      ),
  }
);
