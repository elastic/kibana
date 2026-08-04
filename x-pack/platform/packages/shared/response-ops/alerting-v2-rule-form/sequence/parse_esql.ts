/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, isFunctionExpression, isColumn, isOptionNode } from '@elastic/esql';
import type {
  ESQLCommand,
  ESQLFunction,
  ESQLAstItem,
  ESQLSingleAstItem,
} from '@elastic/esql/types';
import type { SequenceFormValues, SequenceStep, HopWindow } from './form_types';
import { generateStepId, secondsToHopWindow } from './form_types';
import { RULE_EVENTS_INDEX } from './build_esql';

const getColName = (node: ESQLAstItem): string | null => {
  const item = node as ESQLSingleAstItem;
  return isColumn(item) ? item.name : null;
};

const getStringVal = (node: ESQLAstItem): string | null => {
  const item = node as any;
  if (item?.type === 'literal' && typeof item.valueUnquoted === 'string') return item.valueUnquoted;
  return null;
};

const getIntVal = (node: ESQLAstItem): number | null => {
  const item = node as any;
  if (item?.type === 'literal' && typeof item.value === 'number') return Math.trunc(item.value);
  return null;
};

const asFn = (node: ESQLAstItem): ESQLFunction | null => {
  const item = node as ESQLSingleAstItem;
  return isFunctionExpression(item) ? (item as ESQLFunction) : null;
};

const unwrapSingle = (item: ESQLAstItem): ESQLSingleAstItem => {
  if (Array.isArray(item) && item.length === 1) return item[0] as ESQLSingleAstItem;
  return item as ESQLSingleAstItem;
};

const flattenBool = (node: ESQLSingleAstItem, op: string): ESQLSingleAstItem[] => {
  const fn = asFn(node);
  if (!fn || fn.name !== op) return [node];
  return fn.args.flatMap((a) => flattenBool(unwrapSingle(a), op));
};

const parseTCol = (name: string): { stepIdx: number; ruleIdx: number | null } | null => {
  const m = /^t_(\d+)(?:_(\d+))?$/.exec(name);
  if (!m) return null;
  return { stepIdx: parseInt(m[1], 10), ruleIdx: m[2] !== undefined ? parseInt(m[2], 10) : null };
};

const parseEffCol = (name: string): number | null => {
  const m = /^t_(\d+)(?:_eff)?$/.exec(name);
  return m ? parseInt(m[1], 10) : null;
};

interface RuleKindPair {
  ruleId: string;
  kind: 'alert' | 'signal';
}

const ruleKindPairsFromTCaseCondition = (cond: ESQLSingleAstItem): RuleKindPair[] => {
  const andLeaves = flattenBool(cond, 'and');

  const ruleKindLeaves = andLeaves.filter((l) => {
    const f = asFn(l);
    return !(f?.name === '==' && getColName(f.args[0]) === 'status');
  });

  const ruleIdLeaf = ruleKindLeaves.find((l) => {
    const f = asFn(l);
    return f?.name === '==' && getColName(f.args[0]) === 'rule.id';
  });
  const typeLeaf = ruleKindLeaves.find((l) => {
    const f = asFn(l);
    return f?.name === '==' && getColName(f.args[0]) === 'type';
  });
  if (ruleIdLeaf && typeLeaf) {
    const ruleId = getStringVal(asFn(ruleIdLeaf)!.args[1]);
    const typeVal = getStringVal(asFn(typeLeaf)!.args[1]);
    if (ruleId !== null && (typeVal === 'alert' || typeVal === 'signal')) {
      return [{ ruleId, kind: typeVal }];
    }
  }

  const orLeaf = ruleKindLeaves.find((l) => asFn(l)?.name === 'or');
  if (orLeaf) {
    return asFn(orLeaf)!.args.flatMap((a) => {
      const subLeaves = flattenBool(unwrapSingle(a), 'and');
      const subRuleIdLeaf = subLeaves.find((l) => {
        const f = asFn(l);
        return f?.name === '==' && getColName(f.args[0]) === 'rule.id';
      });
      const subTypeLeaf = subLeaves.find((l) => {
        const f = asFn(l);
        return f?.name === '==' && getColName(f.args[0]) === 'type';
      });
      if (!subRuleIdLeaf || !subTypeLeaf) return [];
      const ruleId = getStringVal(asFn(subRuleIdLeaf)!.args[1]);
      const typeVal = getStringVal(asFn(subTypeLeaf)!.args[1]);
      if (ruleId === null || (typeVal !== 'alert' && typeVal !== 'signal')) return [];
      return [{ ruleId, kind: typeVal as 'alert' | 'signal' }];
    });
  }

  return [];
};

const ruleKindPairsFromAgg = (aggFn: ESQLFunction): RuleKindPair[] => {
  if (aggFn.args.length === 0) return [];
  const caseFn = asFn(unwrapSingle(aggFn.args[0]));
  if (!caseFn || caseFn.name !== 'case' || caseFn.args.length === 0) return [];
  return ruleKindPairsFromTCaseCondition(caseFn.args[0] as ESQLSingleAstItem);
};

const parseStatsCmd = (
  cmd: ESQLCommand
): Map<number, Map<number | null, RuleKindPair[]>> | null => {
  const stepColMap = new Map<number, Map<number | null, RuleKindPair[]>>();

  for (const arg of cmd.args) {
    const item = arg as ESQLSingleAstItem;
    if (isOptionNode(item)) continue;

    const fn = asFn(item);
    if (!fn || fn.name !== '=' || fn.args.length !== 2) continue;

    const colName = getColName(fn.args[0]);
    if (!colName || !/^t_\d+/.test(colName)) continue;

    const aggFn = asFn(unwrapSingle(fn.args[1]));
    if (!aggFn) continue;

    const parsed = parseTCol(colName);
    const pairs = ruleKindPairsFromAgg(aggFn);
    if (!parsed || pairs.length === 0) return null;

    if (!stepColMap.has(parsed.stepIdx)) stepColMap.set(parsed.stepIdx, new Map());
    stepColMap.get(parsed.stepIdx)!.set(parsed.ruleIdx, pairs);
  }

  return stepColMap;
};

const extractHopMap = (cmd: ESQLCommand): Map<number, number> => {
  const hopMap = new Map<number, number>();
  if (cmd.args.length === 0) return hopMap;

  const leaves = flattenBool(cmd.args[0] as ESQLSingleAstItem, 'and');
  for (const leaf of leaves) {
    const leFn = asFn(leaf);
    if (!leFn || leFn.name !== '<=' || leFn.args.length !== 2) continue;

    const diffFn = asFn(leFn.args[0]);
    if (!diffFn || diffFn.name !== 'date_diff' || diffFn.args.length !== 3) continue;
    if (getStringVal(diffFn.args[0]) !== 'seconds') continue;

    const fromColName = getColName(diffFn.args[1]);
    if (!fromColName) continue;

    const fromStep = parseEffCol(fromColName);
    if (fromStep === null) continue;

    const secs = getIntVal(leFn.args[1]);
    if (secs === null) continue;

    hopMap.set(fromStep, secs);
  }

  return hopMap;
};

const detectMultiRecoveryIndices = (recoveryQuery: string): number[] => {
  const { root, errors } = Parser.parse(recoveryQuery);
  if (errors.length > 0) return [];

  const statsCmd = root.commands.find((c) => c.name === 'stats');
  if (!statsCmd) return [];

  const indices = new Set<number>();
  for (const arg of statsCmd.args) {
    const item = arg as ESQLSingleAstItem;
    if (isOptionNode(item)) continue;
    const fn = asFn(item);
    if (!fn || fn.name !== '=' || fn.args.length !== 2) continue;
    const colName = getColName(fn.args[0]);
    if (!colName) continue;
    const m = /^a_(\d+)/.exec(colName);
    if (m) indices.add(parseInt(m[1], 10));
  }

  return [...indices].sort((a, b) => a - b);
};

const detectSingleRecoveryIdx = (recoveryQuery: string, steps: SequenceStep[]): number => {
  const { root, errors } = Parser.parse(recoveryQuery);
  if (errors.length > 0) return steps.length - 1;

  const whereCmd = root.commands.find((c) => c.name === 'where');
  if (!whereCmd || whereCmd.args.length === 0) return steps.length - 1;

  const leaves = flattenBool(whereCmd.args[0] as ESQLSingleAstItem, 'and');
  for (const leaf of leaves) {
    const fn = asFn(leaf);
    if (!fn || fn.name !== '==' || fn.args.length !== 2) continue;
    const col = getColName(fn.args[0]);
    const val = getStringVal(fn.args[1]);
    if (col === 'rule.id' && val !== null) {
      const found = steps.findIndex((s) => s.rules.some((r) => r.ruleId === val));
      if (found !== -1) return found;
    }
  }

  return steps.length - 1;
};

export const parseSequenceEsql = (
  breachQuery: string,
  recoveryQuery?: string
): SequenceFormValues | null => {
  if (!breachQuery.trim()) return null;
  if (!breachQuery.includes(RULE_EVENTS_INDEX)) return null;

  const { root, errors } = Parser.parse(breachQuery);
  if (errors.length > 0) return null;

  const { commands } = root;

  const statsCmd = commands.find((c) => c.name === 'stats');
  if (!statsCmd) return null;

  const stepColMap = parseStatsCmd(statsCmd);
  if (!stepColMap) return null;
  if (stepColMap.size < 2) return null;

  const stepIndices = [...stepColMap.keys()].sort((a, b) => a - b);
  if (stepIndices[0] !== 0 || stepIndices[stepIndices.length - 1] !== stepIndices.length - 1) {
    return null;
  }

  const steps: SequenceStep[] = stepIndices.map((stepIdx) => {
    const colMap = stepColMap.get(stepIdx)!;

    if (colMap.has(null)) {
      const pairs = colMap.get(null)!;
      return {
        id: generateStepId(),
        rules: pairs.map(({ ruleId, kind }) => ({
          ruleId,
          ruleName: ruleId,
          groupingFields: [],
          kind,
        })),
        operator: 'or' as const,
      };
    }

    const ruleIdxs = [...(colMap.keys() as IterableIterator<number>)].sort((a, b) => a - b);
    const rules = ruleIdxs.flatMap((ri) =>
      colMap.get(ri)!.map(({ ruleId, kind }) => ({
        ruleId,
        ruleName: ruleId,
        groupingFields: [],
        kind,
      }))
    );

    return { id: generateStepId(), rules, operator: 'and' as const };
  });

  const hopMap = new Map<number, number>();
  for (const cmd of commands) {
    if (cmd.name !== 'where') continue;
    extractHopMap(cmd).forEach((secs, fromStep) => hopMap.set(fromStep, secs));
  }

  const hopWindows: HopWindow[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const secs = hopMap.get(i);
    if (secs === undefined) return null;
    hopWindows.push(secondsToHopWindow(secs));
  }

  let recoveryStepIndex = steps.length - 1;
  let recoveryStepIndices: number[] | undefined;

  if (recoveryQuery?.trim()) {
    const multiIndices = detectMultiRecoveryIndices(recoveryQuery);
    if (multiIndices.length >= 1) {
      recoveryStepIndices = multiIndices;
      recoveryStepIndex = multiIndices[0];
    } else {
      recoveryStepIndex = detectSingleRecoveryIdx(recoveryQuery, steps);
    }
  }

  return {
    steps,
    hopWindows,
    recoveryStepIndex,
    ...(recoveryStepIndices ? { recoveryStepIndices } : {}),
  };
};
