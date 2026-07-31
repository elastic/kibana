/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildUnifiedEpisodesQuery } from './build_unified_episodes_query';

describe('buildUnifiedEpisodesQuery', () => {
  it('queries both views when classic alerts are included', () => {
    const query = buildUnifiedEpisodesQuery({
      spaceId: 'default',
      pageSize: 50,
      includeClassicAlerts: true,
      authorizedRuleTypes: new Map([['.es-query', { authorizedConsumers: { stackAlerts: {} } }]]),
    });

    expect(query).toContain('FROM $.alert-episodes-enriched, $.alerts-v1');
    expect(query).toContain('space_id == "default"');
    expect(query).toContain('MV_CONTAINS(`kibana.space_ids`, "default")');
    expect(query).toContain('`kibana.alert.rule.rule_type_id` IS NULL OR');
    expect(query).toContain('LIMIT 50');
    expect(query).toContain('_is_v1');
    expect(query).toContain('_v1_rule_name');
  });

  it('queries only the enriched view when classic alerts are excluded', () => {
    const query = buildUnifiedEpisodesQuery({
      spaceId: 'space-a',
      pageSize: 10,
      includeClassicAlerts: false,
    });

    expect(query).toContain('FROM $.alert-episodes-enriched');
    expect(query).not.toContain('$.alerts-v1');
    expect(query).not.toContain('kibana.alert.rule.rule_type_id');
    expect(query).not.toContain('_is_v1');
  });

  it('applies list filters, severity sort, and clamps page size', () => {
    const query = buildUnifiedEpisodesQuery({
      spaceId: 'default',
      pageSize: 5000,
      includeClassicAlerts: false,
      sortState: { sortField: 'severity', sortDirection: 'asc' },
      filterState: {
        status: ['active'],
        ruleId: 'rule-1',
        tags: ['prod'],
        severity: ['critical', 'none'],
      },
    });

    expect(query).toContain('`episode.status` == "active"');
    expect(query).toContain('`rule.id` == "rule-1"');
    expect(query).toContain('MV_CONTAINS(last_tags, "prod")');
    expect(query).toContain('severity IN ("critical")');
    expect(query).toContain('severity IS NULL');
    expect(query).toContain('EVAL _severity_sort = CASE');
    expect(query).toContain('SORT _severity_sort ASC');
    expect(query).toContain('LIMIT 1000');
  });
});
