/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic visualization ES|QL review. Syntactic only: no field-name or
 * mapping checks. The event-time field may be `@timestamp`, `event.ingested`,
 * or anything else.
 */

export const ESQL_REVIEW_TOPIC = 'esql' as const;

export type VisualizationEsqlLintKind = 'date_trunc' | 'hardcoded_interval' | 'missing_time_params';

export interface VisualizationEsqlLintProblem {
  kind: VisualizationEsqlLintKind;
  severity: 'miss';
  detail: string;
}

const DATE_TRUNC_CALL = /\bDATE_TRUNC\s*\(/i;
const TBUCKET_CALL = /\bTBUCKET\s*\(/i;
const HAS_TSTART = /\?_tstart\b/;
const HAS_TEND = /\?_tend\b/;
const TIME_INTERVAL =
  /^\s*\d+\s*(?:ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|month|months|y|year|years)\s*$/i;

const splitTopLevelArgs = (argsSource: string): string[] => {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of argsSource) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (char === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    args.push(current);
  }
  return args.map((arg) => arg.trim()).filter(Boolean);
};

const collectCalls = (query: string, name: string): string[][] => {
  const calls: string[][] = [];
  const startRe = new RegExp(`\\b${name}\\s*\\(`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(query)) !== null) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let i = open; i < query.length; i++) {
      if (query[i] === '(') {
        depth += 1;
      } else if (query[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close === -1) {
      continue;
    }
    calls.push(splitTopLevelArgs(query.slice(open + 1, close)));
  }
  return calls;
};

const isTimeBucketed = (query: string): boolean => {
  if (DATE_TRUNC_CALL.test(query) || TBUCKET_CALL.test(query)) {
    return true;
  }
  return collectCalls(query, 'BUCKET').some(
    (args) => args.length >= 3 || (args.length === 2 && TIME_INTERVAL.test(args[1]))
  );
};

export const lintVisualizationEsql = (query: string): VisualizationEsqlLintProblem[] => {
  const problems: VisualizationEsqlLintProblem[] = [];

  if (DATE_TRUNC_CALL.test(query)) {
    problems.push({
      kind: 'date_trunc',
      severity: 'miss',
      detail:
        'Time series uses DATE_TRUNC. Use TBUCKET(75, ?_tstart, ?_tend) instead of a hardcoded interval.',
    });
  }

  const hasHardcodedBucketInterval = collectCalls(query, 'BUCKET').some(
    (args) => args.length === 2 && TIME_INTERVAL.test(args[1])
  );
  if (hasHardcodedBucketInterval) {
    problems.push({
      kind: 'hardcoded_interval',
      severity: 'miss',
      detail:
        'Time series uses a hardcoded BUCKET interval. TBUCKET(75, ?_tstart, ?_tend).',
    });
  }

  if (isTimeBucketed(query) && (!HAS_TSTART.test(query) || !HAS_TEND.test(query))) {
    problems.push({
      kind: 'missing_time_params',
      severity: 'miss',
      detail:
        'Time series query is missing ?_tstart and/or ?_tend. Pass both to the bucket function. The event-time field name does not matter.',
    });
  }

  return problems;
};
