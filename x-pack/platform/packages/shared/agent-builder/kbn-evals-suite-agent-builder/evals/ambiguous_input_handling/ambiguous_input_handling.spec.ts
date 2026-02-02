/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ambiguous and Vague Input Handling Evaluations
 *
 * Tests the DEFAULT agent's ability to handle ambiguous, vague, and incomplete user requests.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

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

evaluate.describe('Ambiguous and Vague Input Handling', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has multiple tools

  evaluate('vague action requests', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: vague actions',
        description: 'Evaluation scenarios for handling requests with vague or unspecified actions',
        examples: [
          {
            input: {
              question: 'Do something with the alerts',
            },
            output: {
              expected: `Asks for clarification about what action and which alerts.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Fix the rule',
            },
            output: {
              expected: `Asks which rule and what the issue is.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Make it better',
            },
            output: {
              expected: `Asks what "it" refers to and what improvements are desired.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Change the configuration',
            },
            output: {
              expected: `Asks which configuration and what changes are needed.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Run the thing',
            },
            output: {
              expected: `Asks what "thing" refers to (query, rule, workflow, etc.).`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('missing required parameters', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: missing parameters',
        description: 'Evaluation scenarios where essential parameters are not provided',
        examples: [
          {
            input: {
              question: 'Create an alert rule',
            },
            output: {
              expected: `Asks for rule name, type, conditions, and schedule.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Search for documents',
            },
            output: {
              expected: `Asks for search criteria and index/data source.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a visualization',
            },
            output: {
              expected: `Asks for data source, metric, and chart type preference.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Show me the metrics',
            },
            output: {
              expected: `Asks which metrics, data source, and time period.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Enable the rule',
            },
            output: {
              expected: `Asks which rule by name or ID. May offer to list rules.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('ambiguous references', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: unclear references',
        description:
          'Evaluation scenarios where references to entities are unclear or could match multiple items',
        examples: [
          {
            input: {
              question: 'Delete the dashboard',
            },
            output: {
              expected: `Asks which dashboard by name or ID. Requests confirmation.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Update the CPU rule to 80%',
            },
            output: {
              expected: `Asks which specific CPU rule. Requests confirmation.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Show that error from earlier',
            },
            output: {
              expected: `Asks for details about which error (time, type, service).`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Copy it to production',
            },
            output: {
              expected: `Asks what "it" refers to. Requests confirmation for production.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Get the one we talked about',
            },
            output: {
              expected: `Explains cannot recall previous conversations. Asks for specifics.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('unclear scope or time range', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: scope and time',
        description: 'Evaluation scenarios where the scope or time range of the request is unclear',
        examples: [
          {
            input: {
              question: 'Show me the errors',
            },
            output: {
              expected: `Asks for time range and data source.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'How many requests did we have?',
            },
            output: {
              expected: `Asks for time period and which services/endpoints.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'List all the cases',
            },
            output: {
              expected: `Lists cases. May ask about filtering by status or time.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'What happened recently?',
            },
            output: {
              expected: `Asks what kind of events and defines "recently".`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Give me all the data',
            },
            output: {
              expected: `Explains request is too broad. Asks for specifics.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('multiple interpretations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: multiple meanings',
        description:
          'Evaluation scenarios where the request could have multiple valid interpretations',
        examples: [
          {
            input: {
              question: 'Check the status',
            },
            output: {
              expected: `Asks what status to check (rules, cases, system health).`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a log for the incident',
            },
            output: {
              expected: `Asks whether to create a case or add comment. Asks for details.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Remove the old ones',
            },
            output: {
              expected: `Asks what to remove and what defines "old".`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Set up monitoring',
            },
            output: {
              expected: `Asks what to monitor and what thresholds/alerts to configure.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Group the results',
            },
            output: {
              expected: `Asks what results and which field to group by.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('confirmation-required operations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: confirmation needed',
        description:
          'Evaluation scenarios for mutating operations that need both clarification and confirmation',
        examples: [
          {
            input: {
              question: 'Disable all the rules',
            },
            output: {
              expected: `Requests confirmation for bulk operation. May ask to limit scope.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Maybe delete the test space?',
            },
            output: {
              expected: `Does not proceed. "Maybe" is not confirmation. Asks for clear confirmation.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'I guess you could update the threshold',
            },
            output: {
              expected: `"I guess" not treated as confirmation. Asks for details and explicit confirmation.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Clean up the unused stuff',
            },
            output: {
              expected: `Asks what is "unused" and what to clean up. Requests confirmation.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Probably should create a backup rule',
            },
            output: {
              expected: `"Probably should" not a command. Asks for rule details and explicit instruction.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('incomplete context', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: insufficient context',
        description: 'Evaluation scenarios where prior context or domain knowledge would be needed',
        examples: [
          {
            input: {
              question: 'Use the standard configuration',
            },
            output: {
              expected: `Asks what "standard configuration" means. Cannot assume org standards.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Apply the usual filters',
            },
            output: {
              expected: `Asks what "usual filters" are. Cannot assume preferences.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Do what you did last time',
            },
            output: {
              expected: `Explains no memory of previous sessions. Asks for description.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Set it up like the other one',
            },
            output: {
              expected: `Asks which existing config and what to configure.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'You know what I mean',
            },
            output: {
              expected: `Explains explicit details needed. Cannot infer intent.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('mixed or compound requests', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: compound requests',
        description:
          'Evaluation scenarios with multiple tasks that may conflict or need prioritization',
        examples: [
          {
            input: {
              question: 'Show me the alerts and maybe create a dashboard and fix the thing',
            },
            output: {
              expected: `Identifies multiple requests. Offers to handle one at a time. Asks for clarification.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Either update the rule or delete it, whatever works',
            },
            output: {
              expected: `Asks user to choose one action. Update and delete are different.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Find errors but not the usual ones, you know the important stuff',
            },
            output: {
              expected: `Asks for criteria to distinguish "important" from "usual" errors.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create something that shows performance, whatever you think is best',
            },
            output: {
              expected: `Asks about services, metrics, and time range. Does not assume preferences.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Do the usual stuff and then something special for the big customer',
            },
            output: {
              expected: `Asks what "usual stuff" and "something special" are. Asks which customer.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('subjective or relative terms', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: relative terms',
        description:
          'Evaluation scenarios using subjective or relative terms that need quantification',
        examples: [
          {
            input: {
              question: 'Show me the slow requests',
            },
            output: {
              expected: `Asks for threshold defining "slow" (>1s, >5s?).`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Find the big files',
            },
            output: {
              expected: `Asks what size qualifies as "big" and which data source.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Alert me when things get bad',
            },
            output: {
              expected: `Asks for specific conditions defining "bad". Needs quantifiable criteria.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Show only the important ones',
            },
            output: {
              expected: `Asks how importance is determined. "Important" is subjective.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Get me the recent high-traffic hosts',
            },
            output: {
              expected: `Asks for definition of "recent" and "high-traffic" thresholds.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('graceful handling and user guidance', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'ambiguous input: user guidance',
        description: 'Evaluation scenarios testing helpful guidance when requests are unclear',
        examples: [
          {
            input: {
              question: 'Help',
            },
            output: {
              expected: `Summarizes capabilities. Asks what user needs help with.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'I am not sure what I need',
            },
            output: {
              expected: `Asks guiding questions about goals, problems, or what info is needed.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What can you do with logs?',
            },
            output: {
              expected: `Explains log capabilities: search, ES|QL, visualizations, alerting.`,
            },
            metadata: {},
          },
          {
            input: {
              question: "Something's wrong but I don't know what",
            },
            output: {
              expected: `Offers to investigate. Asks about symptoms, services, and timing.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Just do whatever',
            },
            output: {
              expected: `Explains specific instructions needed. Asks for task or goal.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
