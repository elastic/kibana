/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { SystemLogActionParams } from '../types';

export function getConnectorType(): ConnectorTypeModel<unknown, unknown, SystemLogActionParams> {
  return {
    id: '.system-log-example',
    iconClass: 'logsApp',
    selectMessage: i18n.translate(
      'xpack.stackConnectors.components.systemLogExample.selectMessageText',
      {
        defaultMessage: 'Example of a system action that sends logs to the Kibana server',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.serverLog.connectorTypeTitle',
      {
        defaultMessage: 'Send to System log - Example',
      }
    ),
    validateParams: (
      actionParams: SystemLogActionParams
    ): Promise<GenericValidationResult<Pick<SystemLogActionParams, 'message'>>> => {
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.stackConnectors.components.serverLog.error.requiredServerLogMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: lazy(() => import('./system_log_example_params')),
    isSystemActionType: true,
  };
}
