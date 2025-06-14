/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { SchedulingConfiguraton } from '@kbn/search-connectors';

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface UpdateConnectorSchedulingArgs {
  connectorId: string;
  scheduling: SchedulingConfiguraton;
  http?: HttpSetup;
}

export const updateConnectorScheduling = async ({
  connectorId,
  scheduling,
  http,
}: UpdateConnectorSchedulingArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/scheduling`;

  await http?.post<undefined>(route, {
    body: JSON.stringify(scheduling),
  });
  return scheduling;
};

export const UpdateConnectorSchedulingApiLogic = createApiLogic(
  ['content', 'update_connector_scheduling_api_logic'],
  updateConnectorScheduling,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.contentConnectors.content.indices.configurationConnector.scheduling.successToast.title',
        { defaultMessage: 'Scheduling successfully updated' }
      ),
  }
);
