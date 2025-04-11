/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';

import {
  CASES_CONNECTOR_ID,
  CASES_CONNECTOR_TITLE,
  CASES_CONNECTOR_TIME_WINDOW_REGEX,
} from '../../../../common/constants';
import type { CasesActionParams } from './types';
import * as i18n from './translations';

interface ValidationErrors {
  timeWindow: string[];
}

export function getConnectorType(): ConnectorTypeModel<{}, {}, CasesActionParams> {
  return {
    id: CASES_CONNECTOR_ID,
    iconClass: 'casesApp',
    selectMessage: i18n.CASE_ACTION_DESC,
    actionTypeTitle: CASES_CONNECTOR_TITLE,
    actionConnectorFields: null,
    isExperimental: false,
    validateParams: async (
      actionParams: CasesActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const errors: ValidationErrors = {
        timeWindow: [],
      };
      const validationResult = {
        errors,
      };
      const timeWindowRegex = new RegExp(CASES_CONNECTOR_TIME_WINDOW_REGEX, 'g');
      const timeWindow = actionParams.subActionParams?.timeWindow;

      if (!timeWindow || !timeWindow.length || !timeWindowRegex.test(timeWindow)) {
        errors.timeWindow.push(i18n.TIME_WINDOW_SIZE_ERROR);
      } else {
        const match = timeWindow.match(/^(\d+)([mhdw])$/);
        if (match) {
          const timeSize = parseInt(match[1], 10);
          const timeUnit = match[2];

          if (timeUnit === 'm' && timeSize < 5) {
            errors.timeWindow.push(i18n.MIN_TIME_WINDOW_SIZE_ERROR);
          }
        }
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./cases_params')),
    isSystemActionType: true,
  };
}
