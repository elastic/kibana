/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Alerting Rules Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the alerting_rules tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// Set default evaluators for this spec
// Focus on tool usage, grounding, and relevance - skip Factuality which requires exact content matching
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Groundedness', 'Relevance', 'Sequence Accuracy'];
if (!process.env.SELECTED_EVALUATORS) {
  process.env.SELECTED_EVALUATORS = SPEC_EVALUATORS.join(',');
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Platform Alerting Rules Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has alerting rules tools

  evaluate('find alerting rules', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: find operations',
        description: 'Evaluation scenarios for finding and listing alerting rules',
        examples: [
          {
            input: {
              question: 'List all alerting rules',
            },
            output: {
              expected: `Lists alerting rules or indicates none exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Find all disabled alerting rules',
            },
            output: {
              expected: `Shows disabled rules or indicates all are enabled. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Show me all metric threshold rules',
            },
            output: {
              expected: `Shows metric threshold rules or indicates none exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Find rules with "CPU" or "memory" in their name',
            },
            output: {
              expected: `Shows matching rules or indicates none found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'What rules are configured for the observability use case?',
            },
            output: {
              expected: `Shows observability rules or indicates none exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('get rule details', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: get details',
        description: 'Evaluation scenarios for retrieving specific rule details',
        examples: [
          {
            input: {
              question: 'Get the details of the rule with ID abc-123',
            },
            output: {
              expected: `Shows rule details or indicates not found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Show me the configuration of the "High CPU Alert" rule',
            },
            output: {
              expected: `Shows rule configuration or indicates not found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'What actions are configured for the error rate alert rule?',
            },
            output: {
              expected: `Shows configured actions or indicates rule not found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'When was the "Production Alerts" rule last executed?',
            },
            output: {
              expected: `Shows last execution info or indicates rule not found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('list rule types', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: list types',
        description: 'Evaluation scenarios for discovering available rule types',
        examples: [
          {
            input: {
              question: 'Use the alerting rules tool to list all available rule types.',
            },
            output: {
              expected: `Lists available rule types from tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use alerting rules to show available observability rule types.',
            },
            output: {
              expected: `Shows observability rule types from tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use the alerting rules tool to check what ML-based rule types are available.',
            },
            output: {
              expected: `Shows ML rule types or indicates none available.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use alerting rules to list any security detection rule types.',
            },
            output: {
              expected: `Shows security rule types or indicates none available.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('create alerting rules', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: create',
        description: 'Evaluation scenarios for creating new alerting rules with confirmation',
        examples: [
          {
            input: {
              question:
                'Create a rule to alert when CPU usage exceeds 90% for more than 5 minutes. I confirm this action.',
            },
            output: {
              expected: `Creates rule or reports error. Shows rule details if created.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question:
                'Create an alert for when error log count exceeds 100 in 5 minutes. Confirmed.',
            },
            output: {
              expected: `Creates rule or reports error. Shows rule ID and configuration.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question:
                'I need a rule to detect anomalies in my APM data. Please create it with confirmation.',
            },
            output: {
              expected: `Creates rule or asks for additional info. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question:
                'Create an index threshold rule that triggers when document count in logs-* exceeds 10000. I confirm.',
            },
            output: {
              expected: `Creates rule or reports error. Shows rule details.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('enable and disable rules', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: enable/disable',
        description: 'Evaluation scenarios for enabling and disabling rules with confirmation',
        examples: [
          {
            input: {
              question: 'Use the alerting rules tool to enable the rule with ID rule-abc-123. I confirm this action.',
            },
            output: {
              expected: `Enables rule or indicates not found. Reports result.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use alerting rules to disable the "Production CPU Alert" rule. Confirmed.',
            },
            output: {
              expected: `Disables rule or indicates not found. Reports result.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use the alerting rules tool to find and list all metric threshold rules so I can disable them.',
            },
            output: {
              expected: `Lists metric threshold rules from tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Use alerting rules to find and re-enable the maintenance rule. I confirm.',
            },
            output: {
              expected: `Enables rule or indicates not found. Reports result.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('safe workflow patterns', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: safe workflows',
        description: 'Evaluation scenarios for following safe alerting rule management workflows',
        examples: [
          {
            input: {
              question: 'Disable the CPU alert rule',
            },
            output: {
              expected: `Finds CPU rules and asks for confirmation before disabling.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Create an alerting rule',
            },
            output: {
              expected: `Asks for required info (name, type, conditions) before creating.`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Show me the current state of the error rate rule, then enable it if it is disabled',
            },
            output: {
              expected: `Shows rule status and asks for confirmation before enabling.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Check if there are any failing rules and summarize their status',
            },
            output: {
              expected: `Shows failing rules or indicates all healthy. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });

  evaluate('edge cases and error handling', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: edge cases',
        description: 'Evaluation scenarios for handling edge cases and errors',
        examples: [
          {
            input: {
              question: 'Get the rule with ID nonexistent-rule-id',
            },
            output: {
              expected: `Indicates rule not found. Handles gracefully.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Delete the CPU alert rule',
            },
            output: {
              expected: `Explains delete not supported. Suggests disabling or Kibana UI.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Update the threshold on my existing rule',
            },
            output: {
              expected: `Explains updates not supported. Suggests alternatives.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a rule without specifying the type',
            },
            output: {
              expected: `Asks for rule type. Lists available types.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('rule inspection and analysis', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform alerting rules: analysis',
        description: 'Evaluation scenarios for inspecting and analyzing alerting rules',
        examples: [
          {
            input: {
              question: 'How many alerting rules are configured and how many are enabled?',
            },
            output: {
              expected: `Shows rule counts by status. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'What is the most frequently used rule type?',
            },
            output: {
              expected: `Shows rule breakdown by type. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Which rules are configured to run most frequently?',
            },
            output: {
              expected: `Shows rules by execution frequency. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
          {
            input: {
              question: 'Are there any rules without configured actions?',
            },
            output: {
              expected: `Lists rules without actions or indicates all have actions. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.alertingRules,
            },
          },
        ],
      },
    });
  });
});
