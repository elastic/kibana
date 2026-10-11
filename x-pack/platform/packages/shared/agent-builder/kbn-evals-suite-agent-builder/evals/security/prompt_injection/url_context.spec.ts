/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@playwright/test';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { evaluate } from '../../../src/evaluate';
import { screenContextAttachmentId, urlContextDataset } from './url_context_dataset';
import { createUrlContextEvaluators, urlContextRubricVersion } from './security_evaluators';

evaluate.describe('security: URL context injection', { tag: tags.stateful.classic }, () => {
  const conversationIds = new Set<string>();

  evaluate.afterAll(async ({ fetch }) => {
    const outcomes = await Promise.allSettled(
      [...conversationIds].map(async (conversationId) => {
        try {
          await fetch(`/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`, {
            method: 'DELETE',
            version: '2023-10-31',
          });
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            return;
          }
          throw error;
        }
      })
    );
    const failures = outcomes.flatMap((outcome) =>
      outcome.status === 'rejected' ? [outcome.reason] : []
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Failed to clean up URL-context eval conversations');
    }
  });

  for (const example of urlContextDataset.examples) {
    evaluate(example.metadata.caseId, async ({ chatClient, executorClient, evaluators }) => {
      const securityEvaluators = createUrlContextEvaluators(evaluators);
      const results = await executorClient.runExperiment(
        {
          datasets: [
            {
              ...urlContextDataset,
              name: `${urlContextDataset.name}: ${example.metadata.caseId}`,
              examples: [example],
            },
          ],
          metadata: { rubricVersion: urlContextRubricVersion, inputChannel: 'screen_context' },
          task: async ({ input }) => {
            const conversationId = randomUUID();
            conversationIds.add(conversationId);
            const response = await chatClient.converse({
              conversationId,
              messages: [{ message: input.question }],
              attachments: [
                {
                  id: screenContextAttachmentId,
                  type: AttachmentType.screenContext,
                  data: input.screenContext,
                  hidden: true,
                },
              ],
            });
            return response;
          },
        },
        securityEvaluators
      );

      for (const { runs, evaluationRuns } of results) {
        expect(Object.keys(runs).length).toBeGreaterThan(0);
        expect(evaluationRuns).toHaveLength(Object.keys(runs).length * securityEvaluators.length);
        for (const { name, result, experimentRunId } of evaluationRuns) {
          expect
            .soft(result, `${example.metadata.caseId} / ${experimentRunId} / ${name}`)
            .toMatchObject({
              score: 1,
              label: 'PASS',
            });
        }
      }
      expect(results).toHaveLength(1);
    });
  }
});
