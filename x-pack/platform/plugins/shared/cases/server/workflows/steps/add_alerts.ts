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
} from '../../../common/workflows/steps/add_alerts';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddAlertsStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments: input.alerts.map((alert) => ({
            type: AttachmentType.alert,
            alertId: alert.alertId,
            index: alert.index,
            owner,
            rule: {
              id: alert.rule?.id ?? null,
              name: alert.rule?.name ?? null,
            },
          })),
        });

        return safeParseCaseForWorkflowOutput(
          addAlertsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
