/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interpolateEsqlQuery } from './interpolate_query';

describe('interpolateEsqlQuery', () => {
  it('should correctly interpolate string and number parameters', () => {
    const template = 'FROM support_ticket | WHERE priority == ?priority AND assigne_id == ?user_id';
    const params = { priority: 'high', user_id: 45 };
    const expected = 'FROM support_ticket | WHERE priority == "high" AND assigne_id == 45';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should correctly interpolate boolean parameters', () => {
    const template = 'FROM nodes | WHERE is_active == ?active AND is_primary == ?primary';
    const params = { active: true, primary: false };
    const expected = 'FROM nodes | WHERE is_active == TRUE AND is_primary == FALSE';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should replace all occurrences of a placeholder', () => {
    const template = 'FROM logs | WHERE user.id == ?user_id OR target.id == ?user_id';
    const params = { user_id: 101 };
    const expected = 'FROM logs | WHERE user.id == 101 OR target.id == 101';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should handle an empty parameters object without changing the template', () => {
    const template = 'FROM events | WHERE event.code == ?code';
    const params = {};
    expect(interpolateEsqlQuery(template, params)).toBe(template);
  });

  it('should ignore extra parameters that are not in the template', () => {
    const template = 'FROM metrics | WHERE host == ?host';
    const params = { host: 'server-alpha', unused_param: 'ignore' };
    const expected = 'FROM metrics | WHERE host == "server-alpha"';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should not partially replace longer placeholders (word boundary test)', () => {
    const template = 'FROM users | WHERE user_name == ?user_name AND user_id == ?user_id';
    const params = { user: 'test', user_id: 99 };
    const expected = 'FROM users | WHERE user_name == ?user_name AND user_id == 99';
    // Only ?user_id should be replaced, ?user should not affect ?user_name
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should correctly handle an empty string parameter', () => {
    const template = 'FROM products | WHERE category == ?category';
    const params = { category: '' };
    const expected = 'FROM products | WHERE category == ""';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should correctly handle the number 0 as a parameter', () => {
    const template = 'FROM tasks | WHERE status_code == ?status';
    const params = { status: 0 };
    const expected = 'FROM tasks | WHERE status_code == 0';
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  it('should handle a mix of all data types in one query', () => {
    const template =
      'FROM telemetry | WHERE device_id == ?device AND temp > ?temp AND enabled == ?enabled';
    const params = { device: 'sensor-3-14', temp: 25.5, enabled: true };
    const expected = `FROM telemetry
| WHERE device_id == "sensor-3-14" AND temp > 25.5 AND enabled == TRUE`;
    expect(interpolateEsqlQuery(template, params)).toBe(expected);
  });

  describe('array parameters', () => {
    it('should correctly interpolate array of integers', () => {
      const template = 'FROM logs | WHERE id IN (?ids)';
      const params = { ids: [1, 2, 3] };
      const expected = 'FROM logs | WHERE id IN ([1, 2, 3])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should correctly interpolate array of strings', () => {
      const template = 'FROM users | WHERE name IN (?names)';
      const params = { names: ['alice', 'bob', 'charlie'] };
      const expected = 'FROM users | WHERE name IN (["alice", "bob", "charlie"])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should correctly interpolate array of decimals', () => {
      const template = 'FROM metrics | WHERE value IN (?values)';
      const params = { values: [1.5, 2.7, 3.14] };
      const expected = 'FROM metrics | WHERE value IN ([1.5, 2.7, 3.14])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should replace all occurrences of an array parameter', () => {
      const template = 'FROM logs | WHERE id IN (?ids) OR parent_id IN (?ids)';
      const params = { ids: [10, 20, 30] };
      const expected = 'FROM logs | WHERE (id IN ([10, 20, 30])) OR (parent_id IN ([10, 20, 30]))';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should handle multiple array parameters in one query', () => {
      const template = 'FROM events | WHERE id IN (?ids) AND status IN (?statuses)';
      const params = { ids: [1, 2, 3], statuses: ['active', 'pending'] };
      const expected =
        'FROM events | WHERE (id IN ([1, 2, 3])) AND (status IN (["active", "pending"]))';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should handle mix of array and non-array parameters', () => {
      const template = 'FROM tickets | WHERE priority == ?priority AND id IN (?ids)';
      const params = { priority: 'high', ids: [100, 200, 300] };
      const expected = 'FROM tickets | WHERE priority == "high" AND (id IN ([100, 200, 300]))';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should handle empty array', () => {
      const template = 'FROM items | WHERE id IN (?ids)';
      const params = { ids: [] };
      const expected = 'FROM items | WHERE id IN ([])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should handle array with single element', () => {
      const template = 'FROM users | WHERE id IN (?ids)';
      const params = { ids: [42] };
      const expected = 'FROM users | WHERE id IN ([42])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });

    it('should handle array parameter with string containing special characters', () => {
      const template = 'FROM logs | WHERE message IN (?messages)';
      const params = { messages: ['hello "world"', "it's ok", 'test\\backslash'] };
      const expected =
        'FROM logs | WHERE message IN (["hello \\"world\\"", "it\'s ok", "test\\\\backslash"])';
      expect(interpolateEsqlQuery(template, params)).toBe(expected);
    });
  });
});
