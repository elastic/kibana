/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform UI Settings Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the uiSettings tool.
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

evaluate.describe('Platform UI Settings Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has UI settings tools

  evaluate('get specific settings', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: get specific',
        description: 'Evaluation scenarios for retrieving specific UI settings',
        examples: [
          {
            input: {
              question: 'What is the current date format setting in Kibana?',
            },
            output: {
              expected: `Shows the date format setting value. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'What timezone is Kibana configured to use?',
            },
            output: {
              expected: `Shows timezone configuration. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'What is the default time range for time-based visualizations?',
            },
            output: {
              expected: `Shows default time range setting. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Is dark mode enabled?',
            },
            output: {
              expected: `Shows whether dark mode is enabled. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
        ],
      },
    });
  });

  evaluate('get all settings', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: get all',
        description: 'Evaluation scenarios for retrieving all UI settings',
        examples: [
          {
            input: {
              question: 'Show me all Kibana advanced settings',
            },
            output: {
              expected: `Lists UI settings with their values. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'What settings are available in Kibana?',
            },
            output: {
              expected: `Lists available settings. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'List all time-related settings',
            },
            output: {
              expected: `Shows time-related settings (dateFormat, timezone). Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
        ],
      },
    });
  });

  evaluate('get user-provided settings', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: user provided',
        description: 'Evaluation scenarios for retrieving user-customized settings',
        examples: [
          {
            input: {
              question: 'What settings have been customized from defaults?',
            },
            output: {
              expected: `Lists customized settings or indicates using defaults. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Show me non-default settings',
            },
            output: {
              expected: `Shows changed settings or indicates all defaults. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Have any Kibana settings been modified?',
            },
            output: {
              expected: `Indicates whether settings have been customized. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
        ],
      },
    });
  });

  evaluate('get registered settings', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: registered settings',
        description: 'Evaluation scenarios for discovering available settings',
        examples: [
          {
            input: {
              question: 'What settings can be configured in Kibana?',
            },
            output: {
              expected: `Lists configurable settings. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Show me the available Discover settings',
            },
            output: {
              expected: `Shows Discover-related settings. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'What visualization settings exist?',
            },
            output: {
              expected: `Shows visualization-related settings. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
        ],
      },
    });
  });

  evaluate('explain behavior differences', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: behavior explanation',
        description: 'Evaluation scenarios for explaining behavior based on settings',
        examples: [
          {
            input: {
              question: 'Why are dates displayed differently in my Kibana?',
            },
            output: {
              expected: `Explains date format setting affects display. May show current value.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'My colleague sees different default time ranges. Why?',
            },
            output: {
              expected: `Explains timepicker settings control default ranges.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Why does Discover show a different number of rows?',
            },
            output: {
              expected: `Explains row limit settings (discover:sampleSize). May show current value.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'The number formatting looks different than expected',
            },
            output: {
              expected: `Explains number format settings affect display.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('edge cases and limitations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: edge cases',
        description: 'Evaluation scenarios for handling edge cases and limitations',
        examples: [
          {
            input: {
              question: 'Get setting with key nonexistent:setting:key',
            },
            output: {
              expected: `Indicates setting doesn't exist. Handles gracefully.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Change the date format to YYYY-MM-DD',
            },
            output: {
              expected: `Explains tool is read-only. Suggests Kibana UI for changes.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Reset all settings to defaults',
            },
            output: {
              expected: `Explains tool is read-only. Suggests Kibana UI for reset.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Show me sensitive settings like API keys',
            },
            output: {
              expected: `Explains sensitive settings are redacted for security.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a new custom setting',
            },
            output: {
              expected: `Explains UI settings are predefined and cannot be created.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('setting categories', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform ui settings: categories',
        description: 'Evaluation scenarios for exploring settings by category',
        examples: [
          {
            input: {
              question: 'What accessibility settings are available?',
            },
            output: {
              expected: `Shows accessibility settings or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'Show me all search-related settings',
            },
            output: {
              expected: `Shows search-related settings. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'What notification settings exist?',
            },
            output: {
              expected: `Shows notification settings or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
          {
            input: {
              question: 'List all Machine Learning settings',
            },
            output: {
              expected: `Shows ML settings or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.uiSettings,
            },
          },
        ],
      },
    });
  });
});
