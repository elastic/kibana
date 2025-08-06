/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
interface ValidationErrors {
  subAction: string[];
  body: string[];
}

import type {
  HelloWorldConfig,
  HelloWorldRunActionParams,
  HelloWorldSecrets,
} from '../../../common/hello_world/everything';
import { HELLO_WORLD_CONNECTOR_ID, SUB_ACTION } from '../../../common/hello_world/everything';

export interface HelloWorldActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: HelloWorldRunActionParams;
}

export type HelloWorldConnector = ConnectorTypeModel<
  HelloWorldConfig,
  HelloWorldSecrets,
  HelloWorldActionParams
>;

export function getHelloWorldConnectorType(): HelloWorldConnector {
  return {
    id: HELLO_WORLD_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.helloWorld.selectMessageText', {
      defaultMessage: 'Just a hello world connector!',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.helloWorld.connectorTypeTitle',
      {
        defaultMessage: 'Hello World',
      }
    ),
    validateParams: async (
      actionParams: HelloWorldActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const errors: ValidationErrors = {
        body: [],
        subAction: [],
      };
      const { subAction, subActionParams } = actionParams;
      const translations = await import('./translations');

      if (!subActionParams.question?.length) {
        errors.body.push(translations.QUESTION_REQUIRED);
      }
      // The internal "subAction" param should always be valid, ensure it is only if "subActionParams" are valid
      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (subAction !== SUB_ACTION.RUN && subAction !== SUB_ACTION.TEST) {
        errors.subAction.push(translations.INVALID_ACTION);
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
