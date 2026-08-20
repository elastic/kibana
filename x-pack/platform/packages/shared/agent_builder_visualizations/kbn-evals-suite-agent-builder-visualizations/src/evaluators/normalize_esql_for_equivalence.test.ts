/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeEsqlForEquivalence } from './normalize_esql_for_equivalence';

describe('normalizeEsqlForEquivalence', () => {
  it('strips a standalone @timestamp bind-param WHERE pipe', () => {
    const withWhere = `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS total_bytes = SUM(bytes) BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend)
| SORT bucket ASC`;

    const withoutWhere = `FROM kibana_sample_data_logs
| STATS total_bytes = SUM(bytes) BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend)
| SORT bucket ASC`;

    expect(normalizeEsqlForEquivalence(withWhere)).toBe(normalizeEsqlForEquivalence(withoutWhere));
    expect(normalizeEsqlForEquivalence(withWhere)).toBe(withoutWhere);
  });

  it('strips TS-source gold WHERE the same way', () => {
    const withWhere = `TS metrics-hostmetricsreceiver.otel-default
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS x = AVG(AVG_OVER_TIME(\`system.cpu.load_average.1m\`)) BY \`Time Bucket\` = TBUCKET(75, ?_tstart, ?_tend)`;

    const withoutWhere = `TS metrics-hostmetricsreceiver.otel-default
| STATS x = AVG(AVG_OVER_TIME(\`system.cpu.load_average.1m\`)) BY \`Time Bucket\` = TBUCKET(75, ?_tstart, ?_tend)`;

    expect(normalizeEsqlForEquivalence(withWhere)).toBe(withoutWhere);
  });

  it('strips order_date (and other event-time) bind-param WHERE pipes', () => {
    const withWhere = `FROM kibana_sample_data_ecommerce
| WHERE order_date >= ?_tstart AND order_date < ?_tend
| STATS \`Order Count\` = COUNT(*) BY category.keyword
| SORT \`Order Count\` DESC
| LIMIT 10`;

    const withoutWhere = `FROM kibana_sample_data_ecommerce
| STATS \`Order Count\` = COUNT(*) BY category.keyword
| SORT \`Order Count\` DESC
| LIMIT 10`;

    expect(normalizeEsqlForEquivalence(withWhere)).toBe(withoutWhere);
  });

  it('keeps non-time predicates when removing the bind-param conjunct', () => {
    const input = `FROM logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend AND response.keyword == "200"
| STATS c = COUNT(*)`;

    expect(normalizeEsqlForEquivalence(input)).toBe(`FROM logs
| WHERE response.keyword == "200"
| STATS c = COUNT(*)`);
  });

  it('strips a middle @timestamp bind-param conjunct', () => {
    const input = `FROM logs
| WHERE a == "x" AND @timestamp >= ?_tstart AND @timestamp < ?_tend AND b == "y"
| STATS c = COUNT(*)`;

    expect(normalizeEsqlForEquivalence(input)).toBe(`FROM logs
| WHERE a == "x" AND b == "y"
| STATS c = COUNT(*)`);
  });

  it('does not strip unrelated WHERE clauses', () => {
    const input = `FROM logs
| WHERE response.keyword == "200"
| STATS c = COUNT(*)`;

    expect(normalizeEsqlForEquivalence(input)).toBe(input);
  });

  it('does not strip WHERE bounds that are not ?_tstart/?_tend bind params', () => {
    const input = `FROM logs
| WHERE @timestamp >= NOW() - 1 day AND @timestamp < NOW()
| STATS c = COUNT(*)`;

    expect(normalizeEsqlForEquivalence(input)).toBe(input);
  });
});
