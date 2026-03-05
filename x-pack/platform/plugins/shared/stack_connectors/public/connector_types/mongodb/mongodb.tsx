/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';

const CONNECTOR_ID = '.mongodb';
const CONNECTOR_NAME = 'MongoDB';

export function getConnectorType(): ActionTypeModel {
  return {
    id: CONNECTOR_ID,
    actionTypeTitle: CONNECTOR_NAME,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.mongodb.selectMessageText', {
      defaultMessage: 'Connect to MongoDB to query and manage data.',
    }),
    validateParams: async () => ({ errors: {} }),
    actionConnectorFields: null,
    actionParamsFields: lazy(() => import('./params')),
  };
}
