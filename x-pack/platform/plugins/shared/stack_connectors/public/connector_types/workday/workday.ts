/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  SUB_ACTION,
  type WorkdayActionParams,
  type WorkdayConfig,
  type WorkdaySecrets,
} from '@kbn/connector-schemas/workday';
import { SELECT_MESSAGE } from './translations';

interface ValidationErrors {
  subAction: string[];
  'subActionParams.workerId': string[];
  'subActionParams.search': string[];
}

export function getConnectorType(): ConnectorTypeModel<
  WorkdayConfig,
  WorkdaySecrets,
  WorkdayActionParams
> {
  return {
    id: CONNECTOR_ID,
    actionTypeTitle: CONNECTOR_NAME,
    iconClass: lazy(() => import('./logo')),
    isExperimental: false,
    selectMessage: SELECT_MESSAGE,
    async validateParams(actionParams): Promise<GenericValidationResult<ValidationErrors>> {
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        subAction: [],
        'subActionParams.workerId': [],
        'subActionParams.search': [],
      };
      const { subAction, subActionParams } = actionParams;

      if (!subAction) {
        errors.subAction.push(translations.ACTION_REQUIRED);
      } else if (!Object.values(SUB_ACTION).includes(subAction)) {
        errors.subAction.push(translations.INVALID_ACTION);
      }

      if (subAction === SUB_ACTION.GET_WORKER) {
        const workerId = (subActionParams as { workerId?: string } | undefined)?.workerId;
        if (!workerId || !workerId.trim()) {
          errors['subActionParams.workerId'].push(translations.WORKER_ID_REQUIRED);
        }
      }

      if (subAction === SUB_ACTION.SEARCH_WORKERS) {
        const search = (subActionParams as { search?: string } | undefined)?.search;
        if (!search || search.length < 3) {
          errors['subActionParams.search'].push(translations.SEARCH_REQUIRED);
        }
      }

      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
