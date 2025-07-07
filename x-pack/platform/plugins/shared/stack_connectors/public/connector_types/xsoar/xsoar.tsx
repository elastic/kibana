/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { XSOARConnector } from './types';
import { XSOAR_CONNECTOR_ID, SUB_ACTION, XSOAR_TITLE } from '../../../common/xsoar/constants';
import { ExecutorParams } from '../../../common/xsoar/types';
import * as i18n from './translations';

interface ValidationErrors {
  name: string[];
}

export function getConnectorType(): XSOARConnector {
  return {
    id: XSOAR_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.SELECT_MESSAGE,
    actionTypeTitle: XSOAR_TITLE,
    validateParams: async (
      actionParams: ExecutorParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const translations = await import('./translations');
      const errors: ValidationErrors = {
        name: [],
      };
      const { subAction, subActionParams } = actionParams;

      if (subAction === SUB_ACTION.RUN) {
        if (!subActionParams?.name?.length) {
          errors.name.push(translations.NAME_REQUIRED);
        }
      }
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
