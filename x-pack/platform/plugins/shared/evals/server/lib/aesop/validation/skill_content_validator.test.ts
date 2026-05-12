/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillContent, suggestCorrectIndexName } from './skill_content_validator';

describe('validateSkillContent', () => {
  it('passes valid skill content using data stream names', () => {
    const content = [
      '# Correlate alerts + logs',
      '',
      '```esql',
      'FROM .alerts-security.alerts-default, logs-endpoint.events.process-default',
      '| WHERE event.category IS NOT NULL',
      '| STATS count = COUNT(*) BY event.category',
      '```',
    ].join('\n');

    const result = validateSkillContent(content);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects skill referencing .internal backing index', () => {
    const content = [
      '```esql',
      'FROM .internal.alerts-security.alerts-default-000001',
      '| WHERE event.category IS NOT NULL',
      '```',
    ].join('\n');

    const result = validateSkillContent(content);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].rule).toBe('no_backing_index_reference');
    expect(result.issues[0].match).toBe('.internal.alerts-security.alerts-default-000001');
  });

  it('rejects skill referencing .ds- data stream backing index', () => {
    const content = 'FROM .ds-logs-endpoint.events.process-default-2024.01.01-000001 | LIMIT 10';

    const result = validateSkillContent(content);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues[0].match).toBe(
      '.ds-logs-endpoint.events.process-default-2024.01.01-000001'
    );
  });

  it('rejects skill with multiple backing index references', () => {
    const content = [
      'FROM .internal.alerts-security.alerts-default-000001,',
      '     .internal.alerts-security.alerts-default-000002',
      '| LIMIT 10',
    ].join('\n');

    const result = validateSkillContent(content);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('passes skill content with no index references', () => {
    const content = [
      '# General investigation skill',
      '',
      '## Steps',
      '1. Check for anomalies',
      '2. Review timeline',
    ].join('\n');

    const result = validateSkillContent(content);
    expect(result.valid).toBe(true);
  });
});

describe('suggestCorrectIndexName', () => {
  it('converts .internal backing index to alias', () => {
    expect(suggestCorrectIndexName('.internal.alerts-security.alerts-default-000001')).toBe(
      '.alerts-security.alerts-default'
    );
  });

  it('converts .ds- backing index to data stream name', () => {
    expect(
      suggestCorrectIndexName('.ds-logs-endpoint.events.process-default-2024.01.01-000001')
    ).toBe('logs-endpoint.events.process-default');
  });

  it('strips rollover suffix from generic index', () => {
    expect(suggestCorrectIndexName('.siem-signals-default-000001')).toBe('.siem-signals-default');
  });

  it('returns null for names without rollover suffix', () => {
    expect(suggestCorrectIndexName('logs-endpoint.events.process-default')).toBeNull();
  });
});
