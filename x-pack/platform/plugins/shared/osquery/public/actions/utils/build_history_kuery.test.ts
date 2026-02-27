/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildHistoryKuery } from './build_history_kuery';

describe('buildHistoryKuery', () => {
  it('returns undefined when no filters are active', () => {
    expect(buildHistoryKuery({ searchTerm: '', selectedUserIds: [] })).toBeUndefined();
  });

  it('returns undefined for whitespace-only search term', () => {
    expect(buildHistoryKuery({ searchTerm: '   ', selectedUserIds: [] })).toBeUndefined();
  });

  it('builds search-only kuery from search term', () => {
    const result = buildHistoryKuery({ searchTerm: 'acpi', selectedUserIds: [] });
    expect(result).toBe(
      '(action_id: acpi* OR queries.query: acpi* OR pack_name: acpi* OR agent_ids: acpi*)'
    );
  });

  it('builds user-only kuery from selected users', () => {
    const result = buildHistoryKuery({ searchTerm: '', selectedUserIds: ['alice'] });
    expect(result).toBe('(user_id: "alice")');
  });

  it('combines search and user filters with AND', () => {
    const result = buildHistoryKuery({
      searchTerm: 'select',
      selectedUserIds: ['alice', 'bob'],
    });
    expect(result).toBe(
      '(action_id: select* OR queries.query: select* OR pack_name: select* OR agent_ids: select*) AND (user_id: "alice" OR user_id: "bob")'
    );
  });

  it('escapes KQL special characters in search term', () => {
    const result = buildHistoryKuery({ searchTerm: 'test"value', selectedUserIds: [] });
    expect(result).toContain('test\\"value');
  });

  it('escapes KQL special characters in user ids', () => {
    const result = buildHistoryKuery({ searchTerm: '', selectedUserIds: ['user"name'] });
    expect(result).toBe('(user_id: "user\\"name")');
  });

  it('trims search term', () => {
    const result = buildHistoryKuery({ searchTerm: '  acpi  ', selectedUserIds: [] });
    expect(result).toBe(
      '(action_id: acpi* OR queries.query: acpi* OR pack_name: acpi* OR agent_ids: acpi*)'
    );
  });
});
