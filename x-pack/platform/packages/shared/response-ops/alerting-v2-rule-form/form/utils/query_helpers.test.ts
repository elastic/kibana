/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../types';
import { getBreachQuery, getRecoverQuery } from './query_helpers';

const BASE = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_SEGMENT = 'WHERE count > 100';
const RECOVERY_SEGMENT = 'WHERE count < 100';

describe('getBreachQuery', () => {
  it('returns empty string for undefined input', () => {
    expect(getBreachQuery(undefined)).toBe('');
  });

  it('returns base directly when the breach segment is empty', () => {
    const query: RuleQuery = {
      base: 'FROM logs-* | LIMIT 10',
      breach: { segment: '' },
    };
    expect(getBreachQuery(query)).toBe('FROM logs-* | LIMIT 10');
  });

  it('returns empty string when base and breach segment are both empty', () => {
    const query: RuleQuery = { base: '', breach: { segment: '' } };
    expect(getBreachQuery(query)).toBe('');
  });

  it('joins base and breach segment', () => {
    const query: RuleQuery = {
      base: BASE,
      breach: { segment: ALERT_SEGMENT },
    };
    expect(getBreachQuery(query)).toBe(`${BASE}\n| ${ALERT_SEGMENT}`);
  });

  it('returns just the breach segment when base is empty', () => {
    const query: RuleQuery = {
      base: '',
      breach: { segment: ALERT_SEGMENT },
    };
    expect(getBreachQuery(query)).toBe(`| ${ALERT_SEGMENT}`);
  });

  it('returns just base when the breach segment is empty', () => {
    const query: RuleQuery = {
      base: BASE,
      breach: { segment: '' },
    };
    expect(getBreachQuery(query)).toBe(BASE);
  });

  it('does not duplicate the pipe when the breach segment already starts with |', () => {
    const query: RuleQuery = {
      base: BASE,
      breach: { segment: '| WHERE count > 100' },
    };
    expect(getBreachQuery(query)).toBe(`${BASE}\n| WHERE count > 100`);
  });

  it('ignores whitespace-only breach segments', () => {
    const query: RuleQuery = {
      base: BASE,
      breach: { segment: '   ' },
    };
    expect(getBreachQuery(query)).toBe(BASE);
  });
});

describe('getRecoverQuery', () => {
  const query: RuleQuery = { base: BASE, breach: { segment: ALERT_SEGMENT } };

  it('returns empty string when both arguments are undefined', () => {
    expect(getRecoverQuery(undefined, undefined)).toBe('');
  });

  it('returns the independent recovery query for the query strategy', () => {
    expect(
      getRecoverQuery(query, {
        strategy: recoveryStrategy.query,
        query: 'FROM logs-* | WHERE status == "ok"',
      })
    ).toBe('FROM logs-* | WHERE status == "ok"');
  });

  it('returns empty string for the query strategy without a query', () => {
    expect(getRecoverQuery(query, { strategy: recoveryStrategy.query })).toBe('');
  });

  it('joins base and recovery segment for the condition strategy', () => {
    expect(
      getRecoverQuery(query, {
        strategy: recoveryStrategy.condition,
        segment: RECOVERY_SEGMENT,
      })
    ).toBe(`${BASE}\n| ${RECOVERY_SEGMENT}`);
  });

  it('returns empty string for the no_breach strategy', () => {
    expect(getRecoverQuery(query, { strategy: recoveryStrategy.no_breach })).toBe('');
  });

  it('returns empty string for the manual strategy', () => {
    expect(getRecoverQuery(query, { strategy: recoveryStrategy.manual })).toBe('');
  });

  it('returns empty string for the condition strategy with an empty segment', () => {
    expect(getRecoverQuery(query, { strategy: recoveryStrategy.condition, segment: '' })).toBe('');
  });

  it('returns just the recovery segment when base is empty', () => {
    expect(
      getRecoverQuery(
        { base: '', breach: { segment: '' } },
        { strategy: recoveryStrategy.condition, segment: RECOVERY_SEGMENT }
      )
    ).toBe(`| ${RECOVERY_SEGMENT}`);
  });

  it('does not duplicate the pipe when the recovery segment already starts with |', () => {
    expect(
      getRecoverQuery(query, {
        strategy: recoveryStrategy.condition,
        segment: '| WHERE count < 100',
      })
    ).toBe(`${BASE}\n| WHERE count < 100`);
  });
});
