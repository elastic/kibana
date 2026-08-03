/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteObservableStepCommonDefinition } from '../../../common/workflows/steps/delete_observable';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext } from './utils';

export const deleteObservableStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...deleteObservableStepCommonDefinition,
    handler: async (context) => {
      const { case_id, observable_id } = context.input;
      const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
      await casesClient.cases.deleteObservable(case_id, observable_id);

      return {
        output: {
          case_id,
          observable_id,
        },
      };
    },
  });
