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
import {
  contentAttachmentId,
  contentInjectionDataset,
  supportAgentInstructions,
} from './content_injection_dataset';
import {
  createContentInjectionEvaluators,
  contentInjectionRubricVersion,
} from './content_injection_evaluators';

evaluate.describe('security: prompt injection content', { tag: tags.stateful.classic }, () => {
  const conversationIds = new Set<string>();
  let supportAgentId: string | undefined;

  evaluate.beforeAll(async ({ fetch }) => {
    supportAgentId = `eval_injection_${randomUUID()}`;
    await fetch('/api/agent_builder/agents', {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({
        id: supportAgentId,
        name: 'Eval: synthetic support policy',
        description:
          'Instruction-hierarchy fixture; contains only synthetic public facts and a fake marker.',
        configuration: { instructions: supportAgentInstructions, tools: [] },
      }),
    });
  });

  evaluate.afterAll(async ({ fetch }) => {
    const paths = [...conversationIds].map(
      (id) => `/api/agent_builder/conversations/${encodeURIComponent(id)}`
    );
    if (supportAgentId)
      paths.push(`/api/agent_builder/agents/${encodeURIComponent(supportAgentId)}`);
    const failures: Error[] = [];
    for (const path of paths) {
      try {
        await fetch(path, { method: 'DELETE', version: '2023-10-31' });
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404)
          continue;
        failures.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (failures.length > 0)
      throw new AggregateError(failures, 'Failed to clean up prompt-injection fixtures');
  });

  for (const example of contentInjectionDataset.examples) {
    evaluate(example.metadata.caseId, async ({ chatClient, executorClient, evaluators }) => {
      if (!supportAgentId) throw new Error('Missing support-policy fixture agent');
      const agentId = example.metadata.inputChannel === 'user_message' ? supportAgentId : undefined;
      const checks = createContentInjectionEvaluators(evaluators);
      const results = await executorClient.runExperiment(
        {
          datasets: [
            {
              ...contentInjectionDataset,
              name: `${contentInjectionDataset.name}: ${example.metadata.caseId}`,
              examples: [example],
            },
          ],
          metadata: { rubricVersion: contentInjectionRubricVersion, ...example.metadata },
          task: async ({ input }) => {
            const conversationId = randomUUID();
            conversationIds.add(conversationId);
            return chatClient.converse({
              conversationId,
              messages: [{ message: input.question }],
              options: { agentId, autoConfirm: false },
              attachments: input.document
                ? [
                    {
                      id: contentAttachmentId,
                      type: AttachmentType.text,
                      data: { content: input.document },
                    },
                  ]
                : undefined,
            });
          },
        },
        checks
      );
      expect(results).toHaveLength(1);
      for (const { runs, evaluationRuns } of results) {
        expect(Object.keys(runs).length).toBeGreaterThan(0);
        expect(evaluationRuns).toHaveLength(Object.keys(runs).length * checks.length);
        for (const { name, result, experimentRunId } of evaluationRuns) {
          expect
            .soft(result, `${example.metadata.caseId} / ${experimentRunId} / ${name}`)
            .toMatchObject({ score: 1, label: 'PASS' });
        }
      }
    });
  }
});
