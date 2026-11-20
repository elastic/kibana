/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wilsonInterval, type ConfidenceInterval } from './wilson';

/** One item labelled by both a judge and a human. `true` is the positive (e.g. "pass") class. */
export interface BinaryLabelPair {
  judge: boolean;
  human: boolean;
}

export interface BinaryAgreement {
  /** Number of paired items. */
  n: number;
  /** 2x2 table; the judge is the row, the human is the column. */
  confusion: { tp: number; fp: number; fn: number; tn: number };
  rawAgreement: number | null;
  rawAgreementInterval: ConfidenceInterval | null;
  /** Cohen's kappa; null when undefined (no data, or chance agreement is 1). */
  kappa: number | null;
  /** Large-sample 95% interval for kappa, clipped to [-1, 1]. */
  kappaInterval: ConfidenceInterval | null;
  /** Of the items the judge called positive, the share the human also called positive. */
  precision: number | null;
  precisionInterval: ConfidenceInterval | null;
  /** Of the items the human called positive, the share the judge also called positive. */
  recall: number | null;
  recallInterval: ConfidenceInterval | null;
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

const intervalOf = (num: number, den: number): ConfidenceInterval | null =>
  den > 0 ? wilsonInterval(num, den) : null;

const Z_95 = 1.959963984540054;

/**
 * Judge-vs-human agreement for binary labels: raw agreement, Cohen's kappa, and the judge's
 * precision and recall against the human labels, with 95% intervals. Flip the labels to
 * measure the judge on the other class (for example on failures).
 */
export const computeBinaryAgreement = (pairs: readonly BinaryLabelPair[]): BinaryAgreement => {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const { judge, human } of pairs) {
    if (judge && human) tp += 1;
    else if (judge) fp += 1;
    else if (human) fn += 1;
    else tn += 1;
  }
  const n = tp + fp + fn + tn;

  let kappa: number | null = null;
  let kappaInterval: ConfidenceInterval | null = null;
  if (n > 0) {
    const po = (tp + tn) / n;
    const pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (n * n);
    if (pe < 1) {
      kappa = (po - pe) / (1 - pe);
      const se = Math.sqrt((po * (1 - po)) / (n * (1 - pe) * (1 - pe)));
      kappaInterval = {
        low: Math.max(-1, kappa - Z_95 * se),
        high: Math.min(1, kappa + Z_95 * se),
      };
    }
  }

  return {
    n,
    confusion: { tp, fp, fn, tn },
    rawAgreement: ratio(tp + tn, n),
    rawAgreementInterval: intervalOf(tp + tn, n),
    kappa,
    kappaInterval,
    precision: ratio(tp, tp + fp),
    precisionInterval: intervalOf(tp, tp + fp),
    recall: ratio(tp, tp + fn),
    recallInterval: intervalOf(tp, tp + fn),
  };
};
