/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import type {
  ActionTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import { CONNECTOR_ID, CONNECTOR_NAME } from '../../../common/notion/constants';
import type { NotionConfig, NotionSecrets } from '../../../common/notion/types';
import type { NotionActionParams } from './types';

interface ValidationErrors {
  subAction: string[];
  body: string[];
}

export function getNotionConnectorType(): ActionTypeModel<
  NotionConfig,
  NotionSecrets,
  NotionActionParams
> {
  return {
    id: CONNECTOR_ID,
    actionTypeTitle: CONNECTOR_NAME,
    iconClass: lazy(() => import('./logo')),
    selectMessage: 'Extract information from Notion',
    validateParams: async (
      actionParams: NotionActionParams
    ): Promise<GenericValidationResult<ValidationErrors>> => {
      const errors: ValidationErrors = {
        body: [],
        subAction: [],
      };
      return { errors };
    },
    actionConnectorFields: lazy(() => import('./notion')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
