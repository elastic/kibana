/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOAD_ERROR_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.loadErrorTitle', {
  defaultMessage: 'Unable to load this review queue',
});
export const RETRY = i18n.translate('xpack.evals.reviewQueues.detail.retry', {
  defaultMessage: 'Retry',
});
export const BACK_TO_QUEUES = i18n.translate('xpack.evals.reviewQueues.detail.backToQueues', {
  defaultMessage: 'Back to review queues',
});
export const RUBRIC_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.rubricTitle', {
  defaultMessage: 'Rubric',
});
export const NO_RUBRIC = i18n.translate('xpack.evals.reviewQueues.detail.noRubric', {
  defaultMessage: 'This queue has no rubric.',
});
export const QUEUE_COMPLETE_TITLE = i18n.translate(
  'xpack.evals.reviewQueues.detail.queueCompleteTitle',
  { defaultMessage: 'Nothing left to review' }
);
export const QUEUE_COMPLETE_BODY = i18n.translate(
  'xpack.evals.reviewQueues.detail.queueCompleteBody',
  { defaultMessage: 'Every item in this queue has been reviewed or skipped.' }
);

export const INPUT_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.inputTitle', {
  defaultMessage: 'Input',
});
export const OUTPUT_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.outputTitle', {
  defaultMessage: 'Output',
});
export const EVIDENCE_UNAVAILABLE = i18n.translate(
  'xpack.evals.reviewQueues.detail.evidenceUnavailable',
  {
    defaultMessage:
      'The input and output could not be reconstructed from this trace. Use the trace below.',
  }
);
export const TRACE_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.traceTitle', {
  defaultMessage: 'Trace',
});

export const VERDICT_LEGEND = i18n.translate('xpack.evals.reviewQueues.detail.verdictLegend', {
  defaultMessage: 'Your verdict',
});
export const PASS = i18n.translate('xpack.evals.reviewQueues.detail.pass', {
  defaultMessage: 'Pass',
});
export const FAIL = i18n.translate('xpack.evals.reviewQueues.detail.fail', {
  defaultMessage: 'Fail',
});
export const SCORE_LABEL = i18n.translate('xpack.evals.reviewQueues.detail.scoreLabel', {
  defaultMessage: 'Score (optional)',
});
export const RATIONALE_LABEL = i18n.translate('xpack.evals.reviewQueues.detail.rationaleLabel', {
  defaultMessage: 'Rationale (optional)',
});
export const SUBMIT = i18n.translate('xpack.evals.reviewQueues.detail.submit', {
  defaultMessage: 'Submit verdict',
});
export const SKIP = i18n.translate('xpack.evals.reviewQueues.detail.skip', {
  defaultMessage: 'Skip',
});
export const SUBMIT_ERROR_TITLE = i18n.translate(
  'xpack.evals.reviewQueues.detail.submitErrorTitle',
  { defaultMessage: 'Unable to submit your verdict' }
);

export const REVEAL_TITLE = i18n.translate('xpack.evals.reviewQueues.detail.revealTitle', {
  defaultMessage: 'Judge verdict',
});
export const YOUR_VERDICT = i18n.translate('xpack.evals.reviewQueues.detail.yourVerdict', {
  defaultMessage: 'Your verdict',
});
export const JUDGE_LABEL = i18n.translate('xpack.evals.reviewQueues.detail.judgeLabel', {
  defaultMessage: 'Judge label',
});
export const JUDGE_SCORE = i18n.translate('xpack.evals.reviewQueues.detail.judgeScore', {
  defaultMessage: 'Judge score',
});
export const NOT_AVAILABLE = i18n.translate('xpack.evals.reviewQueues.detail.notAvailable', {
  defaultMessage: 'Not provided',
});
export const NEXT_ITEM = i18n.translate('xpack.evals.reviewQueues.detail.nextItem', {
  defaultMessage: 'Next item',
});
export const AGREES = i18n.translate('xpack.evals.reviewQueues.detail.agrees', {
  defaultMessage: 'The judge agrees with you',
});
export const DISAGREES = i18n.translate('xpack.evals.reviewQueues.detail.disagrees', {
  defaultMessage: 'The judge disagrees with you',
});

export const getItemPosition = (position: number, total: number) =>
  i18n.translate('xpack.evals.reviewQueues.detail.itemPosition', {
    defaultMessage: 'Item {position} of {total}',
    values: { position, total },
  });

export const getEvaluatorLabel = (name: string, version: string) =>
  i18n.translate('xpack.evals.reviewQueues.detail.evaluatorLabel', {
    defaultMessage: 'Evaluator: {name} ({version})',
    values: { name, version },
  });
