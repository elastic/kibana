/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_ID, CONNECTOR_NAME, SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import type { MCPConnector } from './types';
import { formSerializer, formDeserializer } from './utils/serialization';
import { validateSubActionParamsJson } from './utils/validation';

export const getConnectorType = (): MCPConnector => {
  return {
    id: CONNECTOR_ID,
    actionTypeTitle: CONNECTOR_NAME,
    isExperimental: true,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.mcp.selectMessageText', {
      defaultMessage: 'Connect to an MCP (Model Context Protocol) server.',
    }),
    validateParams: async (actionParams) => {
      const { subAction, subActionParamsRaw } = actionParams;

      if (subAction === SUB_ACTION.CALL_TOOL) {
        return { errors: { subActionParams: validateSubActionParamsJson(subActionParamsRaw) } };
      }

      return { errors: {} };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
    connectorForm: {
      serializer: formSerializer,
      deserializer: formDeserializer,
    },
  };
};
