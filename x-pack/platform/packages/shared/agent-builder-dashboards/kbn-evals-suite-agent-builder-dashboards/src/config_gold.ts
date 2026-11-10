/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRecord } from './dashboard_panels';

/**
 * A value in partial panel config gold, written as the attachment stores it. A
 * Vega `spec` is written as an object, not the stored JSON string.
 */
export type ConfigGoldValue =
  | string
  | number
  | boolean
  | null
  | readonly ConfigGoldValue[]
  | ConfigGold;

/**
 * Deep partial of a panel config, matched the way the visualization suite's
 * Visualization Config vs Intent matches its `expected.config`: only listed keys
 * are checked. A `type` may list alternatives (`['bar', 'bar_horizontal']`).
 */
export interface ConfigGold {
  readonly [key: string]: ConfigGoldValue | undefined;
}

export interface ConfigMatchReport {
  checked: number;
  mismatches: string[];
}

const createReport = (): ConfigMatchReport => ({ checked: 0, mismatches: [] });

const isTypeAlternatives = (key: string, gold: unknown): gold is readonly string[] =>
  key === 'type' && Array.isArray(gold) && gold.every((value) => typeof value === 'string');

const matchLeaf = (
  gold: unknown,
  actual: unknown,
  path: string,
  report: ConfigMatchReport
): void => {
  report.checked += 1;
  if (actual !== gold) {
    report.mismatches.push(
      `${path || 'value'}: expected ${JSON.stringify(gold)}, got ${JSON.stringify(actual)}`
    );
  }
};

/**
 * Each gold item is paired with the unused actual item that satisfies the most
 * of its leaves, so order does not matter and a near match earns partial credit.
 */
const matchArray = (
  gold: readonly unknown[],
  actual: unknown,
  path: string,
  report: ConfigMatchReport
): void => {
  const candidates = Array.isArray(actual) ? actual : [];
  const used = new Set<number>();
  gold.forEach((goldItem, goldIndex) => {
    const itemPath = `${path}[${goldIndex}]`;
    let best: { index: number; report: ConfigMatchReport } | undefined;
    candidates.forEach((candidate, candidateIndex) => {
      if (used.has(candidateIndex) || (best && best.report.mismatches.length === 0)) {
        return;
      }
      const candidateReport = createReport();
      matchValue(goldItem, candidate, itemPath, candidateReport);
      if (!best || candidateReport.mismatches.length < best.report.mismatches.length) {
        best = { index: candidateIndex, report: candidateReport };
      }
    });
    const chosen = best?.report ?? createReport();
    if (best) {
      used.add(best.index);
    } else {
      matchValue(goldItem, undefined, itemPath, chosen);
    }
    report.checked += chosen.checked;
    report.mismatches.push(...chosen.mismatches);
  });
};

const matchValue = (
  gold: unknown,
  actual: unknown,
  path: string,
  report: ConfigMatchReport
): void => {
  if (gold === undefined) {
    return;
  }
  if (Array.isArray(gold)) {
    matchArray(gold, actual, path, report);
    return;
  }
  if (!isRecord(gold)) {
    matchLeaf(gold, actual, path, report);
    return;
  }
  // A missing parent still recurses so every gold leaf below it is counted and reported.
  const actualRecord = isRecord(actual) ? actual : {};
  for (const [key, goldChild] of Object.entries(gold)) {
    const childPath = path ? `${path}.${key}` : key;
    if (isTypeAlternatives(key, goldChild)) {
      report.checked += 1;
      if (!goldChild.includes(String(actualRecord[key]))) {
        report.mismatches.push(
          `${childPath}: expected one of ${JSON.stringify(goldChild)}, got ${JSON.stringify(
            actualRecord[key]
          )}`
        );
      }
      continue;
    }
    matchValue(goldChild, actualRecord[key], childPath, report);
  }
};

/** Subset-matches config gold against a panel config; strings, numbers and booleans compare strictly. */
export const matchConfig = (gold: ConfigGold, actual: unknown): ConfigMatchReport => {
  const report = createReport();
  matchValue(gold, actual, '', report);
  return report;
};
