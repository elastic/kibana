/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { providers } from '../../../common/keep/providers';

export type ConnectorType = ConnectorTypeModel<{}, {}, {}>;
interface ValidationErrors {
  subAction: string[];
  input: string[];
  body: string[];
  // rerank only
  query: string[];
  // text_embedding only
  inputType: string[];
}

export function getConnectorTypes(): ConnectorType[] {
  return [
    {
      id: 'workflow',
      iconClass: 'sparkles',
      isExperimental: true,
      selectMessage: 'Initiate a workflow in Keep',
      selectMessagePreconfigured: 'Initiate a workflow in Keep',
      actionTypeTitle: 'Workflow',
      validateParams: async () => {
        const errors: ValidationErrors = {
          input: [],
          body: [],
          subAction: [],
          inputType: [],
          query: [],
        };
        return { errors };
      },
      actionConnectorFields: lazy(() => import('./connector')),
      actionParamsFields: lazy(() => import('./connector')),
    },
    ...providers.map((provider) => {
      return {
        id: provider.title,
        iconClass: 'sparkles',
        isExperimental: false,
        selectMessage: provider.description || '',
        selectMessagePreconfigured: provider.description || '',
        actionTypeTitle: provider.title,
        validateParams: async () => {
          const errors: ValidationErrors = {
            input: [],
            body: [],
            subAction: [],
            inputType: [],
            query: [],
          };
          return { errors };
        },
        actionConnectorFields: lazy(() => import('./connector')),
        actionParamsFields: lazy(() => import('./connector')),
      };
    }),
  ];
}
