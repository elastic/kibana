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
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../common/constants';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddAlertsStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const attachments = input.alerts.map((alert) => ({
          type: AttachmentType.alert as const,
          alertId: alert.alertId,
          index: alert.index,
          owner,
          rule: {
            id: alert.rule?.id ?? null,
            name: alert.rule?.name ?? null,
          },
        }));

        // Chunk to respect MAX_BULK_CREATE_ATTACHMENTS limit
        let updatedCase;
        for (let i = 0; i < attachments.length; i += MAX_BULK_CREATE_ATTACHMENTS) {
          updatedCase = await client.attachments.bulkCreate({
            caseId: input.case_id,
            attachments: attachments.slice(i, i + MAX_BULK_CREATE_ATTACHMENTS),
          });
        }

        return safeParseCaseForWorkflowOutput(
          addAlertsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
