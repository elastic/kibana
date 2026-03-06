/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addAlertsStepCommonDefinition,
  type AddAlertsStepInput,
  type AddAlertsStepOutput,
} from '../../../common/workflows/steps/add_alerts';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { ADD_ALERTS_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AddAlertsStepInput) => {
        const theCase = await client.cases.get({
          id: input.case_id,
          includeComments: false,
        });

        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments: input.alerts.map((alert) => ({
            type: AttachmentType.alert,
            alertId: alert.alertId,
            index: alert.index,
            owner: theCase.owner,
            rule: {
              id: alert.rule?.id ?? null,
              name: alert.rule?.name ?? null,
            },
          })),
        });

        return updatedCase as AddAlertsStepOutput['case'];
      },
      {
        onError: (_error, input: AddAlertsStepInput) =>
          new Error(ADD_ALERTS_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
