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
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  MICROSOFT_DEFENDER_ENDPOINT_TITLE,
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '../../../common/microsoft_defender_endpoint/constants';
import type {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointActionParams,
  MicrosoftDefenderEndpointSecrets,
} from '../../../common/microsoft_defender_endpoint/types';

interface ValidationErrors {
  subAction: string[];
}

export function getConnectorType(): ConnectorTypeModel<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
  MicrosoftDefenderEndpointActionParams
> {
  return {
    id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
    actionTypeTitle: MICROSOFT_DEFENDER_ENDPOINT_TITLE,
    iconClass: lazy(() => import('./logo')),
    isExperimental: false,
    selectMessage: i18n.translate(
      'xpack.stackConnectors.security.MicrosoftDefenderEndpointSecrets.config.selectMessageText',
      {
        defaultMessage: 'Execute response actions against Microsoft Defender Endpoint hosts',
      }
    ),
    validateParams: async (
      actionParams: MicrosoftDefenderEndpointActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        subAction: [],
      };
      const { subAction } = actionParams;

      // The internal "subAction" param should always be valid, ensure it is only if "subActionParams" are valid
      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (!Object.values(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION).includes(subAction)) {
        errors.subAction.push(translations.INVALID_ACTION);
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./microsoft_defender_endpoint_connector')),
    actionParamsFields: lazy(() => import('./microsoft_defender_endpoint_params')),
    subFeature: 'endpointSecurity',
  };
}
