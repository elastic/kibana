/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CONNECTOR_ID } from '@kbn/connector-schemas/http/constants';
import type {
  ActionParamsType,
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/http';
import { icon } from '@elastic/eui/es/components/icon/assets/globe';
import { formDeserializer, formSerializer } from '../lib/http/form_serialization';

export function getConnectorType(): ConnectorTypeModel<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
> {
  return {
    id: CONNECTOR_ID,
    iconClass: icon, // using the globe icon from EUI assets so it works out of the box with workflows
    selectMessage: i18n.translate('xpack.stackConnectors.components.http.selectMessageText', {
      defaultMessage: 'Send requests to an HTTP endpoint with configurable authentication.',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.http.connectorTypeTitle', {
      defaultMessage: 'HTTP',
    }),
    getHideInUi: () => true, // hidden from the stack connectors UI, will still be available for workflows UI
    actionConnectorFields: lazy(() => import('./http_connectors')),
    actionParamsFields: lazy(() => import('./http_params')),
    validateParams: async (actionParams: ActionParamsType) => {
      return { errors: {} };
    },
    connectorForm: {
      serializer: formSerializer,
      deserializer: formDeserializer,
    },
  };
}
