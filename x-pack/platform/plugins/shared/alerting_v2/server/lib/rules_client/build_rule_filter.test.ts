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

    it('maps id to SO root path and prefixes the id value', () => {
      expect(buildRuleSoFilter('id: "abc-123"')).toBe('alerting_rule.id: "alerting_rule:abc-123"');
    });

    it('leaves already-prefixed id values unchanged', () => {
      expect(buildRuleSoFilter('id: "alerting_rule:abc"')).toBe(
        'alerting_rule.id: "alerting_rule:abc"'
      );
    });

    it('maps metadata.name to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.name: "my rule"')).toBe(
        'alerting_rule.attributes.metadata.name: "my rule"'
      );
    });

    it('maps metadata.description to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.description: "high cpu"')).toBe(
        'alerting_rule.attributes.metadata.description: "high cpu"'
      );
    });

    it('maps metadata.tags to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.tags: "production"')).toBe(
        'alerting_rule.attributes.metadata.tags: "production"'
      );
    });

    // Phase 4 framework fields (step 4.5)
    it('maps metadata.signature_id to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.signature_id: "RULE-001"')).toBe(
        'alerting_rule.attributes.metadata.signature_id: "RULE-001"'
      );
    });

    it('maps metadata.source.type to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.source.type: internal')).toBe(
        'alerting_rule.attributes.metadata.source.type: internal'
      );
    });

    it('maps metadata.source.id to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.source.id: "tpl-001"')).toBe(
        'alerting_rule.attributes.metadata.source.id: "tpl-001"'
      );
    });

    it('maps metadata.source.version to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.source.version: 2')).toBe(
        'alerting_rule.attributes.metadata.source.version: 2'
      );
    });

    it('maps metadata.ownership.managed to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.ownership.managed: true')).toBe(
        'alerting_rule.attributes.metadata.ownership.managed: true'
      );
    });

    it('maps metadata.ownership.solution to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.ownership.solution: security')).toBe(
        'alerting_rule.attributes.metadata.ownership.solution: security'
      );
    });

    it('maps metadata.ownership.domain to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.ownership.domain: detection')).toBe(
        'alerting_rule.attributes.metadata.ownership.domain: detection'
      );
    });

    it('maps metadata.builder_type to SO attributes path', () => {
      expect(buildRuleSoFilter('metadata.builder_type: "security.detection.query"')).toBe(
        'alerting_rule.attributes.metadata.builder_type: "security.detection.query"'
      );
    });
  });

  describe('metadata.builder_fields.* prefix rule (step 4.5)', () => {
    it('accepts a declared typed sub-field (risk_score)', () => {
      expect(buildRuleSoFilter('metadata.builder_fields.risk_score: 75')).toBe(
        'alerting_rule.attributes.metadata.builder_fields.risk_score: 75'
      );
    });

    it('accepts a text sub-field (query)', () => {
      expect(buildRuleSoFilter('metadata.builder_fields.query: "process.name:cmd.exe"')).toBe(
        'alerting_rule.attributes.metadata.builder_fields.query: "process.name:cmd.exe"'
      );
    });

    it('accepts any builder_fields sub-field path (prefix rule)', () => {
      // The prefix rule accepts any non-empty sub-path even if undeclared.
      expect(buildRuleSoFilter('metadata.builder_fields.severity: high')).toBe(
        'alerting_rule.attributes.metadata.builder_fields.severity: high'
      );
    });

    it('rejects metadata.builder_fields without a sub-field (bare prefix)', () => {
      // The bare prefix maps to the flattened container itself, not a leaf.
      expect(() => buildRuleSoFilter('metadata.builder_fields: *')).toThrow(
        'Invalid filter field "metadata.builder_fields"'
      );
    });

    it('accepts builder_fields.* inside compound expressions', () => {
      expect(
        buildRuleSoFilter(
          'metadata.builder_type: "security.detection.query" AND metadata.builder_fields.severity: critical'
        )
      ).toBe(
        '(alerting_rule.attributes.metadata.builder_type: "security.detection.query" AND alerting_rule.attributes.metadata.builder_fields.severity: critical)'
      );
    });
  });

  describe('compound expressions', () => {
    it('handles NOT expressions', () => {
      expect(buildRuleSoFilter('NOT (id: "abc" or id: "def")')).toBe(
        'NOT (alerting_rule.id: "alerting_rule:abc" OR alerting_rule.id: "alerting_rule:def")'
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

    it('rejects metadata.owner (not an indexed field)', () => {
      expect(() => buildRuleSoFilter('metadata.owner: "team-a"')).toThrow(
        'Invalid filter field "metadata.owner"'
      );
    });

    it('rejects grouping.fields (not an indexed field)', () => {
      expect(() => buildRuleSoFilter('grouping.fields: "host.name"')).toThrow(
        'Invalid filter field "grouping.fields"'
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

    it('attaches INVALID_FILTER_FIELD code and allowed_fields in details', () => {
      expect(() => buildRuleSoFilter('unknown_field: value')).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({
            code: 'INVALID_FILTER_FIELD',
            details: expect.objectContaining({ field: 'unknown_field' }),
          }),
        })
      );
    });
  });

  describe('wildcard / exists patterns', () => {
    it('handles exists-style wildcard values', () => {
      expect(buildRuleSoFilter('kind: *')).toBe('alerting_rule.attributes.kind: *');
    });

    it('does not prefix wildcard id values', () => {
      expect(buildRuleSoFilter('id: *')).toBe('alerting_rule.id: *');
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

    it('attaches UNSUPPORTED_FILTER_FUNCTION code with the offending function name', () => {
      fromKueryExpressionMock.mockImplementationOnce((...args: unknown[]) => {
        const ast = jest.requireActual('@kbn/es-query').fromKueryExpression(...args);
        ast.function = 'unknown_function';
        return ast;
      });

      expect(() => buildRuleSoFilter('kind: signal')).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          data: {
            code: 'UNSUPPORTED_FILTER_FUNCTION',
            details: { function: 'unknown_function' },
          },
        })
      );
    });
  });
});
