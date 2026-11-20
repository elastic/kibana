/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeBinaryAgreement,
  computeWeightedKappa,
  REVIEW_FAIL_LABEL,
  REVIEW_PASS_LABEL,
  type BinaryLabelPair,
  type OrdinalAgreement,
  type ReviewQueueAgreement,
  type ScorePair,
} from '@kbn/evals-common';
import type { ReviewItem } from '../../storage/reviews/review_client';

const toPassFail = (label: string | undefined): boolean | undefined => {
  const normalised = label?.trim().toLowerCase();
  if (normalised === REVIEW_PASS_LABEL) {
    return true;
  }
  return normalised === REVIEW_FAIL_LABEL ? false : undefined;
};

/**
 * Judge-vs-human agreement over the reviewed items of one queue. Skipped and pending items
 * carry no human label and never count. An item enters the binary table only when both
 * sides gave a pass/fail label, and the ordinal one only when both gave a number, so an
 * evaluator that scores on a different scale simply yields `null` for the binary half.
 */
export const computeQueueAgreement = (
  items: readonly ReviewItem[],
  context: Pick<ReviewQueueAgreement, 'queue_id' | 'evaluator' | 'counts'>
): ReviewQueueAgreement => {
  const binaryPairs: BinaryLabelPair[] = [];
  const scorePairs: ScorePair[] = [];

  for (const item of items) {
    if (item.status !== 'reviewed' || !item.human) {
      continue;
    }
    const judge = toPassFail(item.score.label);
    const human = toPassFail(item.human.label);
    if (judge !== undefined && human !== undefined) {
      binaryPairs.push({ judge, human });
    }
    if (typeof item.score.value === 'number' && typeof item.human.value === 'number') {
      scorePairs.push({ judge: item.score.value, human: item.human.value });
    }
  }

  const ordinal: OrdinalAgreement | null =
    scorePairs.length > 0
      ? { n: scorePairs.length, weightedKappa: computeWeightedKappa(scorePairs) }
      : null;

  return {
    ...context,
    binary: binaryPairs.length > 0 ? computeBinaryAgreement(binaryPairs) : null,
    ordinal,
  };
};
