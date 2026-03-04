/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_EXAMPLE_NUMBER = i18n.translate(
  'xpack.evals.exampleScoresTable.columnExampleNumber',
  {
    defaultMessage: 'Example #',
  }
);

export const COLUMN_EXAMPLE_ID = i18n.translate('xpack.evals.exampleScoresTable.columnExampleId', {
  defaultMessage: 'Example ID',
});

export const COLUMN_EVALUATOR_SCORES = i18n.translate(
  'xpack.evals.exampleScoresTable.columnEvaluatorScores',
  {
    defaultMessage: 'Evaluator scores',
  }
);

export const COLUMN_REPETITION = i18n.translate('xpack.evals.exampleScoresTable.columnRepetition', {
  defaultMessage: 'Repetition',
});

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

export const getRepetitionButtonLabel = (repetitionIndex: number) =>
  i18n.translate('xpack.evals.exampleScoresTable.repetitionButtonLabel', {
    defaultMessage: 'R{repetitionNumber}',
    values: { repetitionNumber: repetitionIndex + 1 },
  });

export const getRepetitionButtonGroupLegend = (exampleId: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.repetitionButtonGroupLegend', {
    defaultMessage: 'Select repetition for example {exampleId}',
    values: { exampleId },
  });

export const JSON_PREVIEW_BUTTON_LABEL = i18n.translate(
  'xpack.evals.exampleScoresTable.jsonPreviewButtonLabel',
  {
    defaultMessage: 'View JSON',
  }
);
