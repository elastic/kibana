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
import { CONNECTOR_ID, CONNECTOR_NAME } from '@kbn/connector-schemas/servicenow_itsm';
import { MAX_ADDITIONAL_FIELDS_LENGTH } from '@kbn/connector-schemas/servicenow';
import type { ServiceNowConfig, ServiceNowSecrets } from '../lib/servicenow/types';
import type { ServiceNowITSMActionParams } from './types';
import {
  DEFAULT_CORRELATION_ID,
  getConnectorDescriptiveTitle,
  getSelectedConnectorIcon,
} from '../lib/servicenow/helpers';
import { validateJSON } from '../lib/validate_json';

export const SERVICENOW_ITSM_DESC = i18n.translate(
  'xpack.stackConnectors.components.serviceNowITSM.selectMessageText',
  {
    defaultMessage: 'Create an incident in ServiceNow ITSM.',
  }
);

export function getServiceNowITSMConnectorType(): ConnectorTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowITSMActionParams
> {
  return {
    id: CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: SERVICENOW_ITSM_DESC,
    actionTypeTitle: CONNECTOR_NAME,
    actionConnectorFields: lazy(() => import('../lib/servicenow/servicenow_connectors')),
    validateParams: async (
      actionParams: ServiceNowITSMActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('../lib/servicenow/translations');
      const errors = {
        'subActionParams.incident.short_description': new Array<string>(),
        'subActionParams.incident.correlation_id': new Array<string>(),
        'subActionParams.incident.additional_fields': new Array<string>(),
      };

      const validationResult = {
        errors,
      };

      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        actionParams.subAction !== 'closeIncident' &&
        !actionParams.subActionParams.incident.short_description?.length
      ) {
        errors['subActionParams.incident.short_description'].push(translations.TITLE_REQUIRED);
      }

      if (
        actionParams.subAction === 'closeIncident' &&
        !actionParams?.subActionParams?.incident?.correlation_id?.length
      ) {
        errors['subActionParams.incident.correlation_id'].push(
          translations.CORRELATION_ID_REQUIRED
        );
      }

      const jsonErrors = validateJSON({
        value: actionParams.subActionParams?.incident?.additional_fields,
        maxProperties: MAX_ADDITIONAL_FIELDS_LENGTH,
      });

      if (jsonErrors) {
        errors['subActionParams.incident.additional_fields'] = [jsonErrors];
      }

      return validationResult;
    },
    actionParamsFields: lazy(() => import('./servicenow_itsm_params')),
    customConnectorSelectItem: {
      getText: getConnectorDescriptiveTitle,
      getComponent: getSelectedConnectorIcon,
    },
    defaultActionParams: {
      subAction: 'pushToService',
      subActionParams: {
        incident: { correlation_id: DEFAULT_CORRELATION_ID },
        comments: [],
      },
    },
    defaultRecoveredActionParams: {
      subAction: 'closeIncident',
      subActionParams: {
        incident: { correlation_id: DEFAULT_CORRELATION_ID },
      },
    },
  };
}
