/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MessageRole } from '@kbn/inference-common';
import moment from 'moment';
import { INTERNAL_CASE_SUMMARY_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { getCaseSummaryPrompt } from './get_case_summary_prompt';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
  query: schema.object({
    connectorId: schema.string(),
  }),
};

export const getCaseSummaryRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_SUMMARY_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const inferenceClient = await caseContext.getInferenceClient();

      if (!inferenceClient) {
        throw new Error('Inference client is not available');
      }

      const caseId = request.params.case_id;
      const connectorId = request.query.connectorId;
      const caseData = await casesClient.cases.get({ id: caseId, includeComments: true });
      const prompt = getCaseSummaryPrompt(caseData);

      const chatResponse = await inferenceClient.chatComplete({
        connectorId,
        messages: [
          {
            role: MessageRole.User,
            content: prompt,
          },
        ],
      });

      return response.ok({
        body: {
          content: chatResponse.content,
          generatedAt: moment().toISOString(),
        },
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to generate case summary: ${error}`,
        error,
      });
    }
  },
});
