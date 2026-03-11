/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_EXAMPLE_ID = i18n.translate('xpack.evals.exampleScoresTable.columnExampleId', {
  defaultMessage: 'Example ID',
});

export const COLUMN_EVALUATOR_SCORES = i18n.translate(
  'xpack.evals.exampleScoresTable.columnEvaluatorScores',
  {
    defaultMessage: 'Evaluator scores',
  }
);

export const COLUMN_INPUT = i18n.translate('xpack.evals.exampleScoresTable.columnInput', {
  defaultMessage: 'Input',
});

export const COLUMN_OUTPUT = i18n.translate('xpack.evals.exampleScoresTable.columnOutput', {
  defaultMessage: 'Output',
});

export const COLUMN_TRACE = i18n.translate('xpack.evals.exampleScoresTable.columnTrace', {
  defaultMessage: 'Trace',
});

export const NO_EVALUATOR_SCORES = i18n.translate(
  'xpack.evals.exampleScoresTable.noEvaluatorScores',
  {
    defaultMessage: 'No scores',
  }
);

export const SCORE_NOT_AVAILABLE = i18n.translate(
  'xpack.evals.exampleScoresTable.scoreNotAvailable',
  {
    defaultMessage: 'n/a',
  }
);

export const EMPTY_TABLE_MESSAGE = i18n.translate(
  'xpack.evals.exampleScoresTable.emptyTableMessage',
  {
    defaultMessage: 'No example scores available.',
  }
);

export const TABLE_CAPTION = i18n.translate('xpack.evals.exampleScoresTable.tableCaption', {
  defaultMessage: 'Per-example evaluation scores',
});

export const getTraceButtonAriaLabel = (traceId: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.traceButtonAriaLabel', {
    defaultMessage: 'Open trace {traceId}',
    values: { traceId },
  });

export const getRepetitionPaginationAriaLabel = (exampleId: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.repetitionPaginationAriaLabel', {
    defaultMessage: 'Select repetition for example {exampleId}',
    values: { exampleId },
  });

export const EVALUATOR_EXPLANATION = i18n.translate(
  'xpack.evals.exampleScoresTable.evaluatorExplanation',
  {
    defaultMessage: 'Explanation',
  }
);

export const EVALUATOR_METADATA = i18n.translate(
  'xpack.evals.exampleScoresTable.evaluatorMetadata',
  {
    defaultMessage: 'Metadata',
  }
);

export const EVALUATOR_VIEW_TRACE = i18n.translate(
  'xpack.evals.exampleScoresTable.evaluatorViewTrace',
  {
    defaultMessage: 'View trace',
  }
);

export const getEvaluatorViewTraceAriaLabel = (evaluatorName: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.evaluatorViewTraceAriaLabel', {
    defaultMessage: 'View trace for evaluator {evaluatorName}',
    values: { evaluatorName },
  });

export const getEvaluatorAccordionAriaLabel = (evaluatorName: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.evaluatorAccordionAriaLabel', {
    defaultMessage: 'Toggle details for evaluator {evaluatorName}',
    values: { evaluatorName },
  });
