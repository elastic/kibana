/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleQuery } from '../../form/types';
import { getBreachQuery } from '../../form/utils/query_helpers';
import { enterManualSplitQuery, exitManualSplitQuery } from './manual_split_query';

const unified = (pipeline: string): RuleQuery => ({
  base: pipeline,
  breach: { segment: '' },
});

describe('manual split query helpers', () => {
  it('enterManualSplitQuery pre-populates base and alert when the heuristic can split', () => {
    const query = enterManualSplitQuery(unified('FROM logs-* | WHERE count > 100'));

    expect(query).toEqual({
      base: 'FROM logs-*',
      breach: { segment: '| WHERE count > 100' },
    });
  });

  it('enterManualSplitQuery pre-populates a WHERE-without-STATS split', () => {
    const query = enterManualSplitQuery(unified('FROM kbn* | where system.cpu.cores > 5'));

    expect(query).toEqual({
      base: 'FROM kbn*',
      breach: { segment: '| where system.cpu.cores > 5' },
    });
  });

  it('enterManualSplitQuery places the full pipeline in base when the heuristic cannot isolate a base', () => {
    const query = enterManualSplitQuery(unified('| WHERE count > 100'));

    expect(query).toEqual({
      base: '| WHERE count > 100',
      breach: { segment: '' },
    });
  });

  it('enterManualSplitQuery pre-populates a STATS + WHERE split like unified Apply', () => {
    const query = enterManualSplitQuery(
      unified('FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100')
    );

    expect(query).toEqual({
      base: 'FROM logs-*\n| STATS count = COUNT(*) BY host.name',
      breach: { segment: '| WHERE count > 100' },
    });
  });

  it('enterManualSplitQuery uses the no_alert_condition fallback like unified Apply', () => {
    const fullQuery = 'FROM logs-* | STATS count = COUNT(*) BY host.name';
    const query = enterManualSplitQuery(unified(fullQuery));

    expect(query).toEqual({
      base: fullQuery,
      breach: { segment: '' },
    });
  });

  it('enterManualSplitQuery produces only base and breach — recovery lives outside the query', () => {
    const query = enterManualSplitQuery(unified('FROM logs-* | WHERE count > 100'));

    expect(Object.keys(query).sort()).toEqual(['base', 'breach']);
  });

  it('exitManualSplitQuery stores the combined pipeline for unified editing', () => {
    const query = exitManualSplitQuery(unified('FROM logs-* | WHERE count > 100'));

    expect(query).toEqual({
      base: 'FROM logs-* | WHERE count > 100',
      breach: { segment: '' },
    });
    expect(getBreachQuery(query)).toBe('FROM logs-* | WHERE count > 100');
  });

  it('exitManualSplitQuery joins base and breach segment into base', () => {
    const query = exitManualSplitQuery({
      base: 'FROM logs-*',
      breach: { segment: '| WHERE count > 100' },
    });

    expect(query).toEqual({
      base: 'FROM logs-*\n| WHERE count > 100',
      breach: { segment: '' },
    });
  });
});
