/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { buildRuleSoFilter } from './build_rule_filter';

jest.mock('@kbn/es-query', () => ({
  __esModule: true,
  fromKueryExpression: jest.fn((...args: unknown[]) =>
    jest.requireActual('@kbn/es-query').fromKueryExpression(...args)
  ),
  toKqlExpression: (...args: unknown[]) =>
    jest.requireActual('@kbn/es-query').toKqlExpression(...args),
}));

const fromKueryExpressionMock = fromKueryExpression as jest.Mock;

describe('buildRuleSoFilter', () => {
  describe('empty / match-all', () => {
    it('returns empty string unchanged', () => {
      expect(buildRuleSoFilter('')).toBe('');
    });
  });

  describe('field mapping', () => {
    it('maps kind to SO attributes path', () => {
      expect(buildRuleSoFilter('kind: signal')).toBe('alerting_rule.attributes.kind: signal');
    });

    it('maps enabled to SO attributes path', () => {
      expect(buildRuleSoFilter('enabled: true')).toBe('alerting_rule.attributes.enabled: true');
    });

    it('maps id to SO root path (not under attributes)', () => {
      expect(buildRuleSoFilter('id: "abc-123"')).toBe('alerting_rule.id: "abc-123"');
    });

    it('maps metadata.name to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.name: "my rule"')).toBe(
        'alerting_rule.attributes.metadata.name: "my rule"'
      );
    });

    it('maps metadata.owner to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.owner: "team-a"')).toBe(
        'alerting_rule.attributes.metadata.owner: "team-a"'
      );
    });

    it('maps metadata.tags to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.tags: "production"')).toBe(
        'alerting_rule.attributes.metadata.tags: "production"'
      );
    });
  });

  describe('compound expressions', () => {
    it('handles NOT expressions', () => {
      expect(buildRuleSoFilter('NOT (id: "abc" or id: "def")')).toBe(
        'NOT (alerting_rule.id: "abc" OR alerting_rule.id: "def")'
      );
    });

    it('handles compound AND filters', () => {
      expect(buildRuleSoFilter('enabled: true AND kind: alert')).toBe(
        '(alerting_rule.attributes.enabled: true AND alerting_rule.attributes.kind: alert)'
      );
    });

    it('handles compound OR filters', () => {
      expect(buildRuleSoFilter('kind: alert or kind: signal')).toBe(
        '(alerting_rule.attributes.kind: alert OR alerting_rule.attributes.kind: signal)'
      );
    });

    it('handles grouped expressions', () => {
      expect(buildRuleSoFilter('(kind: signal)')).toBe('alerting_rule.attributes.kind: signal');
    });

    it('normalizes whitespace through AST round-trip', () => {
      expect(buildRuleSoFilter('kind:   signal')).toBe('alerting_rule.attributes.kind: signal');
    });
  });

  describe('field validation', () => {
    it('rejects unknown fields', () => {
      expect(() => buildRuleSoFilter('unknown_field: value')).toThrow(
        'Invalid filter field "unknown_field"'
      );
    });

    it('rejects pre-prefixed SO fields (consumers must use clean API names)', () => {
      expect(() => buildRuleSoFilter('alerting_rule.attributes.kind: signal')).toThrow(
        'Invalid filter field'
      );
    });

    it('includes allowed fields in the error message', () => {
      expect(() => buildRuleSoFilter('bad: value')).toThrow('Allowed fields:');
    });

    it('rejects unknown fields within compound expressions', () => {
      expect(() => buildRuleSoFilter('kind: signal AND unknown: value')).toThrow(
        'Invalid filter field "unknown"'
      );
    });
  });

  describe('wildcard / exists patterns', () => {
    it('handles exists-style wildcard values', () => {
      expect(buildRuleSoFilter('kind: *')).toBe('alerting_rule.attributes.kind: *');
    });
  });

  describe('exhaustive function handling', () => {
    it('does not throw for known KQL function types', () => {
      expect(() => buildRuleSoFilter('kind: signal')).not.toThrow('Unsupported KQL function');
      expect(() => buildRuleSoFilter('kind: signal AND enabled: true')).not.toThrow(
        'Unsupported KQL function'
      );
      expect(() => buildRuleSoFilter('NOT kind: signal')).not.toThrow('Unsupported KQL function');
      expect(() => buildRuleSoFilter('kind: signal OR kind: alert')).not.toThrow(
        'Unsupported KQL function'
      );
    });

    it('throws on unsupported KQL function types', () => {
      fromKueryExpressionMock.mockImplementationOnce((...args: unknown[]) => {
        const ast = jest.requireActual('@kbn/es-query').fromKueryExpression(...args);
        ast.function = 'unknown_function';
        return ast;
      });

      expect(() => buildRuleSoFilter('kind: signal')).toThrow(
        'Unsupported KQL function "unknown_function" in filter'
      );
    });
  });
});
