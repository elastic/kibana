/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Evaluator Catalog
export const PAGE_TITLE = i18n.translate('xpack.evals.evaluators.pageTitle', {
  defaultMessage: 'Evaluators',
});

export const CREATE_EVALUATOR_BUTTON = i18n.translate('xpack.evals.evaluators.createButton', {
  defaultMessage: 'Create evaluator',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.evals.evaluators.searchPlaceholder', {
  defaultMessage: 'Filter by name...',
});

export const COLUMN_NAME = i18n.translate('xpack.evals.evaluators.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_KIND = i18n.translate('xpack.evals.evaluators.columns.kind', {
  defaultMessage: 'Kind',
});

export const COLUMN_TYPE = i18n.translate('xpack.evals.evaluators.columns.type', {
  defaultMessage: 'Type',
});

export const COLUMN_DESCRIPTION = i18n.translate('xpack.evals.evaluators.columns.description', {
  defaultMessage: 'Description',
});

export const COLUMN_USAGE_COUNT = i18n.translate('xpack.evals.evaluators.columns.usageCount', {
  defaultMessage: 'Usage Count',
});

export const COLUMN_VERSION = i18n.translate('xpack.evals.evaluators.columns.version', {
  defaultMessage: 'Version',
});

// Kind badges
export const KIND_LLM = i18n.translate('xpack.evals.evaluators.kind.llm', {
  defaultMessage: 'LLM',
});

export const KIND_CODE = i18n.translate('xpack.evals.evaluators.kind.code', {
  defaultMessage: 'CODE',
});

// Type badges
export const TYPE_LLM_JUDGE = i18n.translate('xpack.evals.evaluators.type.llmJudge', {
  defaultMessage: 'llm-judge',
});

export const TYPE_CODE = i18n.translate('xpack.evals.evaluators.type.code', {
  defaultMessage: 'code',
});

export const TYPE_ESQL = i18n.translate('xpack.evals.evaluators.type.esql', {
  defaultMessage: 'esql',
});

export const TYPE_PREBUILT = i18n.translate('xpack.evals.evaluators.type.prebuilt', {
  defaultMessage: 'prebuilt',
});

// Create evaluator flyout
export const CREATE_FLYOUT_TITLE = i18n.translate('xpack.evals.evaluators.createFlyout.title', {
  defaultMessage: 'Create evaluator',
});

export const STEP_CHOOSE_TYPE = i18n.translate('xpack.evals.evaluators.createFlyout.stepType', {
  defaultMessage: 'Choose type',
});

export const STEP_CONFIGURE = i18n.translate('xpack.evals.evaluators.createFlyout.stepConfigure', {
  defaultMessage: 'Configure',
});

export const STEP_TEST = i18n.translate('xpack.evals.evaluators.createFlyout.stepTest', {
  defaultMessage: 'Test',
});

export const TYPE_CARD_LLM_JUDGE_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.llmJudge.title',
  { defaultMessage: 'LLM Judge' }
);

export const TYPE_CARD_LLM_JUDGE_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.llmJudge.description',
  { defaultMessage: 'Use a language model to evaluate outputs based on a prompt template.' }
);

export const TYPE_CARD_CODE_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.code.title',
  { defaultMessage: 'Code' }
);

export const TYPE_CARD_CODE_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.code.description',
  { defaultMessage: 'Write a JavaScript function to programmatically score outputs.' }
);

export const TYPE_CARD_ESQL_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esql.title',
  { defaultMessage: 'ES|QL' }
);

export const TYPE_CARD_ESQL_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esql.description',
  { defaultMessage: 'Use ES|QL queries to evaluate outputs against Elasticsearch data.' }
);

export const ESQL_QUERY_LABEL = i18n.translate('xpack.evals.evaluators.createFlyout.esqlQuery', {
  defaultMessage: 'ES|QL query template',
});

export const ESQL_QUERY_HELP = i18n.translate('xpack.evals.evaluators.createFlyout.esqlQueryHelp', {
  // Curly braces are escaped with single quotes so ICU MessageFormat treats
  // `{input}` and `{output}` as literal placeholders for the user, not as
  // message-formatter arguments.
  defaultMessage:
    "Use '{input}' and '{output}' as placeholders. The query result is used for scoring.",
});

export const ESQL_SCORE_EXPR_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlScoreExpr',
  { defaultMessage: 'Score expression' }
);

export const ESQL_SCORE_EXPR_HELP = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlScoreExprHelp',
  {
    defaultMessage:
      'Expression to compute score from query result. Available: row_count, columns, values, result.',
  }
);

export const ESQL_PASS_COND_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlPassCond',
  { defaultMessage: 'Pass condition' }
);

export const ESQL_PASS_COND_HELP = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlPassCondHelp',
  {
    defaultMessage:
      'Expression that evaluates to true when the evaluator passes. Available: score, row_count.',
  }
);

export const ESQL_VARIABLES_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlVarsTitle',
  { defaultMessage: 'Available variables' }
);

export const ESQL_VARIABLES_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.esqlVarsDesc',
  {
    defaultMessage:
      'Score expression: row_count (number of result rows), columns (column metadata), values (result data), result (full ES|QL response). Pass condition: score (computed score), row_count.',
  }
);

export const NAME_LABEL = i18n.translate('xpack.evals.evaluators.createFlyout.nameLabel', {
  defaultMessage: 'Name',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.descriptionLabel',
  { defaultMessage: 'Description' }
);

export const NAME_REQUIRED_ERROR = i18n.translate(
  'xpack.evals.evaluators.createFlyout.nameRequired',
  { defaultMessage: 'Name is required.' }
);

export const NAME_FORMAT_ERROR = i18n.translate(
  'xpack.evals.evaluators.createFlyout.nameFormatError',
  {
    defaultMessage:
      'Name must be lowercase with hyphens only (e.g., my-evaluator). Min 2 characters, no leading/trailing hyphens.',
  }
);

// LLM Judge config
export const PROMPT_TEMPLATE_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.promptTemplate',
  { defaultMessage: 'Prompt template' }
);

export const PROMPT_TEMPLATE_HELP = i18n.translate(
  'xpack.evals.evaluators.createFlyout.promptTemplateHelp',
  {
    defaultMessage:
      'Use {input}, {output}, and {reference} as variable placeholders in your prompt.',
    values: {
      input: '{input}',
      output: '{output}',
      reference: '{reference}',
    },
  }
);

export const INSERT_VARIABLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.insertVariable',
  { defaultMessage: 'Insert variable' }
);

export const SCORING_MODE_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.scoringMode',
  { defaultMessage: 'Scoring mode' }
);

export const SCORING_BOOLEAN = i18n.translate(
  'xpack.evals.evaluators.createFlyout.scoringBoolean',
  { defaultMessage: 'Boolean (0 or 1)' }
);

export const SCORING_CONTINUOUS = i18n.translate(
  'xpack.evals.evaluators.createFlyout.scoringContinuous',
  { defaultMessage: 'Continuous (0-1)' }
);

export const SCORING_RUBRIC = i18n.translate('xpack.evals.evaluators.createFlyout.scoringRubric', {
  defaultMessage: 'Rubric-based',
});

export const CONNECTOR_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.connectorLabel',
  { defaultMessage: 'Connector' }
);

export const FEEDBACK_KEY_LABEL = i18n.translate(
  'xpack.evals.evaluators.createFlyout.feedbackKey',
  { defaultMessage: 'Feedback key name' }
);

// Code evaluator config
export const CODE_BODY_LABEL = i18n.translate('xpack.evals.evaluators.createFlyout.codeBody', {
  defaultMessage: 'Function body',
});

export const CODE_VARIABLES_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.codeVariables',
  { defaultMessage: 'Available variables' }
);

export const CODE_VARIABLES_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.codeVariablesDesc',
  {
    defaultMessage:
      'Your function receives: input (object), output (object), expected (object), metadata (object)',
  }
);

export const CODE_RETURN_TYPE_TITLE = i18n.translate(
  'xpack.evals.evaluators.createFlyout.codeReturnType',
  { defaultMessage: 'Expected return type' }
);

export const CODE_RETURN_TYPE_DESCRIPTION = i18n.translate(
  'xpack.evals.evaluators.createFlyout.codeReturnTypeDesc',
  // Wrap the literal type-shape in single quotes so ICU MessageFormat does
  // not try to parse `{ score: ... }` as a malformed argument list.
  { defaultMessage: "'{ score: number, label?: string, explanation?: string }'" }
);

// Buttons
export const CANCEL_BUTTON = i18n.translate('xpack.evals.evaluators.cancelButton', {
  defaultMessage: 'Cancel',
});

export const BACK_BUTTON = i18n.translate('xpack.evals.evaluators.backButton', {
  defaultMessage: 'Back',
});

export const NEXT_BUTTON = i18n.translate('xpack.evals.evaluators.nextButton', {
  defaultMessage: 'Next',
});

export const SAVE_BUTTON = i18n.translate('xpack.evals.evaluators.saveButton', {
  defaultMessage: 'Save',
});

export const EDIT_BUTTON = i18n.translate('xpack.evals.evaluators.editButton', {
  defaultMessage: 'Edit',
});

export const TEST_BUTTON = i18n.translate('xpack.evals.evaluators.testButton', {
  defaultMessage: 'Test',
});

export const DELETE_BUTTON = i18n.translate('xpack.evals.evaluators.deleteButton', {
  defaultMessage: 'Delete',
});

// Detail flyout
export const DETAIL_FLYOUT_TITLE = i18n.translate('xpack.evals.evaluators.detailFlyout.title', {
  defaultMessage: 'Evaluator details',
});

export const SHARE_ACROSS_SPACES = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.shareAcrossSpaces',
  { defaultMessage: 'Share across spaces' }
);

export const DETAIL_CONFIG_SECTION = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.configSection',
  { defaultMessage: 'Configuration' }
);

export const DETAIL_VERSIONS_SECTION = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.versionsSection',
  { defaultMessage: 'Version history' }
);

export const DETAIL_TAGS_SECTION = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.tagsSection',
  { defaultMessage: 'Tags' }
);

export const ADD_TAG_PLACEHOLDER = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.addTagPlaceholder',
  { defaultMessage: 'Add tag...' }
);

// Playground
export const PLAYGROUND_TITLE = i18n.translate('xpack.evals.evaluators.playground.title', {
  defaultMessage: 'Test evaluator',
});

export const PLAYGROUND_SAMPLE_INPUT = i18n.translate(
  'xpack.evals.evaluators.playground.sampleInput',
  { defaultMessage: 'Sample input' }
);

export const PLAYGROUND_SAMPLE_OUTPUT = i18n.translate(
  'xpack.evals.evaluators.playground.sampleOutput',
  { defaultMessage: 'Sample output' }
);

export const PLAYGROUND_RUN_TEST = i18n.translate('xpack.evals.evaluators.playground.runTest', {
  defaultMessage: 'Run test',
});

export const PLAYGROUND_RESULT_TITLE = i18n.translate(
  'xpack.evals.evaluators.playground.resultTitle',
  { defaultMessage: 'Result' }
);

export const PLAYGROUND_SCORE = i18n.translate('xpack.evals.evaluators.playground.score', {
  defaultMessage: 'Score',
});

export const PLAYGROUND_LABEL = i18n.translate('xpack.evals.evaluators.playground.label', {
  defaultMessage: 'Label',
});

export const PLAYGROUND_EXPLANATION = i18n.translate(
  'xpack.evals.evaluators.playground.explanation',
  { defaultMessage: 'Explanation' }
);

export const PLAYGROUND_TIMING = i18n.translate('xpack.evals.evaluators.playground.timing', {
  defaultMessage: 'Timing',
});

export const PLAYGROUND_RESOLVED_PROMPT = i18n.translate(
  'xpack.evals.evaluators.playground.resolvedPrompt',
  { defaultMessage: 'Resolved prompt' }
);

export const PLAYGROUND_RAW_RESPONSE = i18n.translate(
  'xpack.evals.evaluators.playground.rawResponse',
  { defaultMessage: 'Raw LLM response' }
);

export const getTimingLabel = (ms: number) =>
  i18n.translate('xpack.evals.evaluators.playground.timingMs', {
    defaultMessage: '{ms}ms',
    values: { ms },
  });

export const getVersionLabel = (version: number, date: string) =>
  i18n.translate('xpack.evals.evaluators.detailFlyout.versionLabel', {
    defaultMessage: 'v{version} - {date}',
    values: { version, date },
  });

// Delete confirmation
export const DELETE_CONFIRM_TITLE = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.deleteConfirmTitle',
  { defaultMessage: 'Delete evaluator' }
);

export const DELETE_CONFIRM_BODY = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.deleteConfirmBody',
  { defaultMessage: 'This action cannot be undone. Are you sure?' }
);

export const DELETE_CONFIRM_BUTTON = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.deleteConfirmButton',
  { defaultMessage: 'Delete' }
);

// Error messages
export const DELETE_ERROR_TITLE = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.deleteErrorTitle',
  { defaultMessage: 'Failed to delete evaluator' }
);

export const UPDATE_ERROR_TITLE = i18n.translate(
  'xpack.evals.evaluators.detailFlyout.updateErrorTitle',
  { defaultMessage: 'Failed to update evaluator' }
);

// Empty state
export const EMPTY_STATE_TITLE = i18n.translate('xpack.evals.evaluators.emptyState.title', {
  defaultMessage: 'No evaluators found',
});

export const EMPTY_STATE_BODY = i18n.translate('xpack.evals.evaluators.emptyState.body', {
  defaultMessage: 'Create an evaluator to get started.',
});
