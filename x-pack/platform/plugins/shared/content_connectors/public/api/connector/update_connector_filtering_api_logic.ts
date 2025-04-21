/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { FilteringRules } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface PutConnectorFilteringArgs {
  connectorId: string;
  http?: HttpSetup;
}

export type PutConnectorFilteringResponse = FilteringRules;

export const putConnectorFiltering = async ({ connectorId, http }: PutConnectorFilteringArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/filtering`;

  return await http?.put(route);
};

export const ConnectorFilteringApiLogic = createApiLogic(
  ['content', 'connector_filtering_api_logic'],
  putConnectorFiltering,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.index.connector.filtering.successToastRules.title',
        { defaultMessage: 'Sync rules updated' }
      ),
  }
);
