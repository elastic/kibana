/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import {
  buildPipelineSteps,
  isComplexEsql,
  splitQueryForHighlight,
  NO_DATA_COMPLEX_CHAR_THRESHOLD,
  NO_DATA_COMPLEX_LINE_THRESHOLD,
} from './build_pipeline_steps';
import { DEMO_NO_DATA, DEMO_QUERY, DEMO_RECOVERY } from './demo_queries';

describe('isComplexEsql', () => {
  it('returns false for short queries', () => {
    expect(isComplexEsql('FROM metrics-* | LIMIT 1')).toBe(false);
  });

  it('returns true when line count exceeds the threshold', () => {
    const query = Array.from({ length: NO_DATA_COMPLEX_LINE_THRESHOLD + 1 }, () => 'a').join('\n');
    expect(isComplexEsql(query)).toBe(true);
  });

  it('returns true when character count exceeds the threshold', () => {
    const query = 'x'.repeat(NO_DATA_COMPLEX_CHAR_THRESHOLD + 1);
    expect(isComplexEsql(query)).toBe(true);
  });
});

describe('buildPipelineSteps', () => {
  it('builds demo steps with Alert query label (not breach)', () => {
    const steps = buildPipelineSteps(DEMO_QUERY, DEMO_RECOVERY, DEMO_NO_DATA);
    expect(steps.map((s) => s.id)).toEqual(['base', 'alert', 'recovery', 'noData']);
    expect(steps.find((s) => s.id === 'alert')?.title).toBe('Alert query');
    expect(steps.find((s) => s.id === 'alert')?.query).toContain('WHERE avg_cpu_pct > 85');
    expect(steps.find((s) => s.id === 'recovery')?.query).toContain('WHERE avg_cpu_pct <= 85');
    expect(steps.find((s) => s.id === 'noData')?.query).toBe(DEMO_QUERY.base);
  });

  it('hints to complete the query when base is empty', () => {
    const steps = buildPipelineSteps(
      { base: '', breach: { segment: '' } },
      undefined,
      undefined
    );
    expect(steps[0].hint).toMatch(/Complete the rule query/);
    expect(steps.every((s) => s.query == null || s.query === '')).toBe(true);
  });

  it('omits recovery query for no_breach strategy', () => {
    const steps = buildPipelineSteps(DEMO_QUERY, { strategy: recoveryStrategy.no_breach }, undefined);
    expect(steps.find((s) => s.id === 'recovery')?.query).toBeUndefined();
    expect(steps.find((s) => s.id === 'recovery')?.hint).toMatch(/no_breach/);
  });

  it('marks no-data as preferDiagram when the presence query is complex', () => {
    const longBase = Array.from({ length: 45 }, (_, i) => `| EVAL col${i} = ${i}`).join('\n');
    const steps = buildPipelineSteps(
      { base: `FROM metrics-*\n${longBase}`, breach: { segment: 'WHERE x > 1' } },
      undefined,
      { strategy: noDataStrategy.keep_last }
    );
    expect(steps.find((s) => s.id === 'noData')?.preferDiagram).toBe(true);
  });

  it('hints when no-data strategy is ignore', () => {
    const steps = buildPipelineSteps(DEMO_QUERY, undefined, { strategy: noDataStrategy.ignore });
    expect(steps.find((s) => s.id === 'noData')?.query).toBeUndefined();
    expect(steps.find((s) => s.id === 'noData')?.hint).toMatch(/does not run a no-data check/);
  });

  it('attaches highlight segments for alert and recovery', () => {
    const steps = buildPipelineSteps(DEMO_QUERY, DEMO_RECOVERY, DEMO_NO_DATA);
    expect(steps.find((s) => s.id === 'alert')?.highlightSegment).toContain('avg_cpu_pct > 85');
    expect(steps.find((s) => s.id === 'recovery')?.highlightSegment).toContain('avg_cpu_pct <= 85');
    expect(steps.find((s) => s.id === 'base')?.highlightSegment).toBeUndefined();
  });
});

describe('splitQueryForHighlight', () => {
  it('splits the assembled query around the segment', () => {
    const full = 'FROM metrics-* | STATS c = COUNT(*) | WHERE c > 10';
    expect(splitQueryForHighlight(full, 'WHERE c > 10')).toEqual({
      before: 'FROM metrics-* | STATS c = COUNT(*) | ',
      highlight: 'WHERE c > 10',
      after: '',
    });
  });

  it('returns the full query muted when no segment matches', () => {
    expect(splitQueryForHighlight('FROM logs-*', 'WHERE x > 1')).toEqual({
      before: 'FROM logs-*',
      highlight: '',
      after: '',
    });
  });
});
