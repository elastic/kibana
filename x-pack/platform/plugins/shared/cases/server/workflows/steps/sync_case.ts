/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { syncCaseStepCommonDefinition } from '../../../common/workflows/steps/sync_case';
import { toLegacyCaseResponse } from '../../common/attachments';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext, safeParseCaseForWorkflowOutput } from './utils';

/**
 * Applies the external incident to the case(s) it was pushed to. Meant to run from a
 * workflow triggered by the external system's webhook, which only carries the incident id.
 */
export const syncCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...syncCaseStepCommonDefinition,
    handler: async (context) => {
      const { case_id: caseId, external_id: externalId, connector_id: connectorId } = context.input;

      try {
        const client = await getCasesClientFromStepsContext(context, getCasesClient);

        const caseIds =
          caseId != null
            ? [caseId]
            : (
                await client.cases.findByExternalId({
                  externalId: externalId as string,
                  connectorId,
                })
              ).map((theCase) => theCase.id);

        if (caseIds.length === 0) {
          context.logger.warn(
            `No case found for external id ${externalId}${
              connectorId != null ? ` on connector ${connectorId}` : ''
            }; nothing to sync`
          );
        }

        const syncedCases = await pMap(
          caseIds,
          async (id) => {
            try {
              return await client.cases.sync({ caseId: id });
            } catch (err) {
              context.logger.error(`Error syncing case ${id} from its external incident: ${err}`);
              return null;
            }
          },
          { concurrency: 5 }
        );

        // The client returns unified comments; the output schema mirrors the
        // public (legacy) wire shape, so convert back before validating.
        const output = safeParseCaseForWorkflowOutput(syncCaseStepCommonDefinition.outputSchema, {
          cases: syncedCases.map((syncedCase) =>
            syncedCase ? toLegacyCaseResponse(syncedCase) : syncedCase
          ),
        });

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
