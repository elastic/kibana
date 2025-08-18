/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<
  {
    evaluateDataset: EvaluateDataset;
  },
  {}
>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Default Agent Knowledge Base Retrieval', { tag: '@svlSearch' }, () => {
  evaluate('default agent test', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'onechat: default-agent-dummy-dataset',
        description: 'Basic Knowledge Base retrieval tests for OneChat Default Agent',
        examples: [
          {
            input: {
              question: 'List all the organization with project limit less than 50',
            },
            output: {
              expected: 'There seems to be no organization with a project limit < 50',
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Today is Jan 1 2025. Between support agents with ids 1454 and 6056, which one has a higher ticket closure rate for high or urgent priority issues in last 180 days?',
            },
            output: {
              expected:
                'assignee_id, total_tickets, closed_tickets, closure_rate\n6056,12,7,58.33\n1454,3,1,33.33',
            },
            metadata: {},
          },
          {
            input: {
              question:
                'I just issued a refund but entered the wrong amount. Can I cancel or reverse it?',
            },
            output: {
              expected: 'No. Once a refund has been initiated, it cannot be canceled or reversed',
            },
            metadata: {},
          },
          {
            input: {
              question: 'When did tina.jackson@gray-smith.com signup?',
            },
            output: {
              expected: 'Oct 23, 2024 at 05:42:03',
            },
            metadata: {},
          },
          {
            input: {
              question: "Wix's website builder is available in how many different languages?",
            },
            output: {
              expected: 'The Wix website builder is available in 17 languages',
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
