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

/**
 * Parse alerts input from workflow context.
 * Handles Liquid template serialization where `| json` produces a JSON string
 * instead of a native array, and Zod wrapping that creates ["[{...}]"].
 */
const parseAlertsInput = (
  val: unknown
): Array<{ alertId: string; index: string; rule?: { id?: string; name?: string } }> => {
  if (Array.isArray(val)) {
    // Zod-wrapped: single-element array with a JSON string
    if (val.length === 1 && typeof val[0] === 'string') {
      try {
        const parsed = JSON.parse(val[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // not JSON
      }
    }
    return val;
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON
    }
  }
  return [];
};

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddAlertsStepInput) => {
      const alerts = parseAlertsInput(input.alerts);

      return withCaseOwner(client, input.case_id, async (owner) => {
        const attachments = alerts.map((alert) => ({
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
