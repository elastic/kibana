/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CONNECTOR_ID } from '@kbn/connector-schemas/api/constants';
import type {
  ActionParamsType,
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/api';
import { icon as logoWebhook } from '@elastic/eui/es/components/icon/assets/logo_webhook';
import { formDeserializer, formSerializer } from '../lib/api/form_serialization';

export function getConnectorType(): ConnectorTypeModel<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
> {
  return {
    id: CONNECTOR_ID,
    iconClass: logoWebhook, // using the logoWebhook icon from EUI assets so it works out of the box with workflows
    selectMessage: i18n.translate('xpack.stackConnectors.components.api.selectMessageText', {
      defaultMessage: 'Send requests to an API with configurable authentication.',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.api.connectorTypeTitle', {
      defaultMessage: 'API',
    }),
    actionConnectorFields: lazy(() => import('./api_connectors')),
    actionParamsFields: lazy(() => import('./api_params')),
    validateParams: async (actionParams: ActionParamsType) => {
      return { errors: {} };
    },
    connectorForm: {
      serializer: formSerializer,
      deserializer: formDeserializer,
    },
  };
}
