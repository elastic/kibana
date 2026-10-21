/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDiagnosticBag } from './diagnostics';
import { kqlToEsqlWhere, lowerFormulaToStatsEval, parseFormula } from './formula';

describe('parseFormula', () => {
  it('parses simple aggregation calls', () => {
    expect(parseFormula('count()')).toEqual({ kind: 'agg', fn: 'count' });
    expect(parseFormula('sum(bytes)')).toEqual({
      kind: 'agg',
      fn: 'sum',
      field: 'bytes',
    });
  });

  it('parses kql / lucene / shift named arguments', () => {
    expect(parseFormula("count(kql='FlightDelay : true')")).toEqual({
      kind: 'agg',
      fn: 'count',
      kqlFilter: 'FlightDelay : true',
    });
    expect(parseFormula("count(lucene='FlightDelay:true')")).toEqual({
      kind: 'agg',
      fn: 'count',
      luceneFilter: 'FlightDelay:true',
    });
    expect(parseFormula("count(shift='1w')")).toEqual({
      kind: 'agg',
      fn: 'count',
      shift: '1w',
    });
  });

  it('parses binary expressions with precedence', () => {
    expect(parseFormula('count() / count() - 1')).toEqual({
      kind: 'binary',
      op: '-',
      left: {
        kind: 'binary',
        op: '/',
        left: { kind: 'agg', fn: 'count' },
        right: { kind: 'agg', fn: 'count' },
      },
      right: { kind: 'number', value: 1 },
    });
  });

  it('parses parenthesized expressions', () => {
    expect(parseFormula('(count() / count()) - 1')).toEqual({
      kind: 'binary',
      op: '-',
      left: {
        kind: 'binary',
        op: '/',
        left: { kind: 'agg', fn: 'count' },
        right: { kind: 'agg', fn: 'count' },
      },
      right: { kind: 'number', value: 1 },
    });
  });
});

describe('kqlToEsqlWhere', () => {
  it('renders simple `field : value` terms with type-aware literals', () => {
    expect(kqlToEsqlWhere('FlightDelay : true').where).toBe('FlightDelay == true');
    expect(kqlToEsqlWhere('count : 5').where).toBe('count == 5');
    expect(kqlToEsqlWhere('level : "warning"').where).toBe('level == "warning"');
    expect(kqlToEsqlWhere('event.action : "user login"').where).toBe(
      '`event.action` == "user login"'
    );
  });

  it('treats `*` as the universal match (no WHERE)', () => {
    expect(kqlToEsqlWhere('*')).toEqual({});
  });

  it('renders AND / OR / NOT combinations', () => {
    expect(kqlToEsqlWhere('FlightDelay : true AND Cancelled : false').where).toBe(
      '(FlightDelay == true) AND (Cancelled == false)'
    );
    expect(kqlToEsqlWhere('NOT Cancelled : true').where).toBe('NOT (Cancelled == true)');
  });
});

describe('lowerFormulaToStatsEval', () => {
  it('lowers a filtered ratio into STATS aggregations + EVAL', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: "count(kql='FlightDelay : true') / count()",
      formulaColumnLabel: 'Delayed %',
      diagnostics: bag,
    });
    expect(lowered).toBeDefined();
    expect(lowered!.aggregations.map((agg) => agg.expression)).toEqual([
      'COUNT(*) WHERE FlightDelay == true',
      'COUNT(*)',
    ]);
    expect(lowered!.evalExpression).toBe('(TO_DOUBLE(__f0__) / TO_DOUBLE(__f1__))');
    expect(lowered!.shiftedAggregations).toEqual([]);
  });

  it('escapes aggregation fields with special characters', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: 'sum(kibana.alert.risk_score)',
      formulaColumnLabel: 'Risk',
      diagnostics: bag,
    });

    expect(lowered?.aggregations[0]?.expression).toBe('SUM(`kibana.alert.risk_score`)');
  });

  it('separates time-shifted aggregations from current ones', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: "count() / count(shift='1w') - 1",
      formulaColumnLabel: 'Delayed vs 1 week earlier',
      diagnostics: bag,
    });
    expect(lowered).toBeDefined();
    expect(lowered!.aggregations).toHaveLength(1);
    expect(lowered!.aggregations[0]!.expression).toBe('COUNT(*)');
    expect(lowered!.shiftedAggregations).toHaveLength(1);
    expect(lowered!.shiftedAggregations[0]!.shift).toBe('1w');
    expect(lowered!.shiftedAggregations[0]!.expression).toBe('COUNT(*)');
    expect(lowered!.evalExpression).toBe('((TO_DOUBLE(__f0__) / TO_DOUBLE(__f1__)) - 1)');
  });

  it('folds time_range() into a millisecond literal for per-day rates', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: 'count() / (time_range() / 1000 / 60 / 60 / 24)',
      formulaColumnLabel: 'Trxns / day',
      diagnostics: bag,
      timeRangeMs: 7 * 86_400_000,
    });
    expect(lowered).toBeDefined();
    expect(lowered!.aggregations.map((agg) => agg.expression)).toEqual(['COUNT(*)']);
    expect(lowered!.evalExpression).toBe(
      '(TO_DOUBLE(__f0__) / ((((604800000.0 / 1000) / 60) / 60) / 24))'
    );
  });

  it('degrades time_range() with a diagnostic when no time range is available', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: 'count() / (time_range() / 86400000)',
      formulaColumnLabel: 'Trxns / day',
      diagnostics: bag,
    });
    expect(lowered).toBeUndefined();
    const diagnostic = bag.list.find((d) => d.code === 'lens.formBased.formula-unlowered');
    expect(diagnostic?.message).toContain('time_range()');
  });

  it('returns undefined and a diagnostic for unsupported functions', () => {
    const bag = createDiagnosticBag('test');
    const lowered = lowerFormulaToStatsEval({
      formula: 'pearson(field)',
      formulaColumnLabel: 'Correlation',
      diagnostics: bag,
    });
    expect(lowered).toBeUndefined();
    expect(bag.list.find((d) => d.code === 'lens.formBased.formula-unlowered')).toBeDefined();
  });
});
