/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber } from 'lodash/fp';
import { lazy } from 'react';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';

import {
  CASES_CONNECTOR_ID,
  CASES_CONNECTOR_TITLE,
  CASES_CONNECTOR_TIME_WINDOW_REGEX,
  MAX_OPEN_CASES,
} from '../../../../common/constants';
import type { CasesActionParams } from './types';
import * as i18n from './translations';

interface ValidationErrors {
  timeWindow: string[];
  maximumCasesToOpen: string[];
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
        maximumCasesToOpen: [],
      };
      const validationResult = {
        errors,
      };

      const timeWindowRegex = new RegExp(CASES_CONNECTOR_TIME_WINDOW_REGEX, 'g');

      if (actionParams.subActionParams) {
        if (
          !actionParams.subActionParams.timeWindow ||
          !actionParams.subActionParams.timeWindow.length ||
          !timeWindowRegex.test(actionParams.subActionParams.timeWindow)
        ) {
          errors.timeWindow.push(i18n.TIME_WINDOW_SIZE_ERROR);
          return validationResult;
        }
        if (actionParams.subActionParams.timeWindow) {
          const timeWindow = actionParams.subActionParams.timeWindow;
          const timeSize = timeWindow.slice(0, -1);
          const timeUnit = timeWindow.slice(-1);
          const timeSizeAsNumber = Number(timeSize);
          if (timeUnit === 'm' && timeSizeAsNumber < 5) {
            errors.timeWindow.push(i18n.MIN_TIME_WINDOW_SIZE_ERROR);
          }
        }

        const { maximumCasesToOpen } = actionParams.subActionParams;
        if (isNumber(maximumCasesToOpen)) {
          if (maximumCasesToOpen < 1 || maximumCasesToOpen > MAX_OPEN_CASES) {
            errors.maximumCasesToOpen.push(i18n.MAX_CASES_TO_OPEN_ERROR(MAX_OPEN_CASES));
          }
        }
      }

      return validationResult;
    },
    actionParamsFields: lazy(() => import('./cases_params')),
    isSystemActionType: true,
  };
}
