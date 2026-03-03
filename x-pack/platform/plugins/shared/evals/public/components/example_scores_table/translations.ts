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

export const getTraceButtonAriaLabel = (traceId: string) =>
  i18n.translate('xpack.evals.exampleScoresTable.traceButtonAriaLabel', {
    defaultMessage: 'Open trace {traceId}',
    values: { traceId },
  });
