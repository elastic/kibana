/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { CONNECTOR_ID } from '@kbn/connector-schemas/ssh_host';

export const getConnectorType = (): ConnectorTypeModel => ({
  id: CONNECTOR_ID,
  iconClass: 'consoleApp',
  actionTypeTitle: i18n.translate('xpack.stackConnectors.components.sshHost.actionTypeTitle', {
    defaultMessage: 'SSH Host',
  }),
  selectMessage: i18n.translate('xpack.stackConnectors.components.sshHost.selectMessage', {
    defaultMessage: 'Run scripts on any SSH-accessible host (Linux or macOS).',
  }),
  validateParams: async () => ({ errors: {} }),
  actionConnectorFields: lazy(() => import('./ssh_host_connector_fields')),
  actionParamsFields: lazy(async () => ({ default: () => null })),
});
