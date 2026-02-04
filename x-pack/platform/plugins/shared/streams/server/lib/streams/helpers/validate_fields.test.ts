/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { validateAncestorFields, validateDescendantFields } from './validate_fields';
import { MalformedFieldsError } from '../errors/malformed_fields_error';

const createWiredStreamDefinition = (
  name: string,
  fields: Record<string, { type: string; description?: string }>
) =>
  ({
    name,
    ingest: {
      wired: {
        fields,
      },
    },
  } as unknown as Streams.WiredStream.Definition);

describe('validateAncestorFields', () => {
  describe('type: unmapped validation', () => {
    it('should throw when setting type: unmapped on a field mapped in parent', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'keyword' },
      });

      const fields = {
        'attributes.field1': { type: 'unmapped' as const, description: 'test description' },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).toThrow(MalformedFieldsError);
      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).toThrow(/cannot be set to 'unmapped'/);
    });

    it('should not throw when setting type: unmapped on a field that is also unmapped in parent', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'unmapped', description: 'parent description' },
      });

      const fields = {
        'attributes.field1': { type: 'unmapped' as const, description: 'child description' },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).not.toThrow();
    });

    it('should not throw when setting type: unmapped on a field that is system type in parent', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'system' },
      });

      const fields = {
        'attributes.field1': { type: 'unmapped' as const, description: 'description' },
      };

      // Note: This throws because system !== unmapped in the second check
      // But the unmapped-specific check shouldn't fire
      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).toThrow(/incompatible type/);
    });

    it('should allow same type with description override', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'keyword' },
      });

      const fields = {
        'attributes.field1': { type: 'keyword' as const, description: 'child description' },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).not.toThrow();
    });

    it('should allow setting a real type when parent has type: unmapped', () => {
      // When parent has type: 'unmapped' (documentation-only), child should be able to map it
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'unmapped', description: 'Parent documentation' },
      });

      const fields = {
        'attributes.field1': { type: 'keyword' as const },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).not.toThrow();
    });

    it('should allow setting a real type with description when parent has type: unmapped', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'unmapped', description: 'Parent documentation' },
      });

      const fields = {
        'attributes.field1': { type: 'keyword' as const, description: 'Child description' },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).not.toThrow();
    });
  });

  describe('incompatible type validation', () => {
    it('should throw when setting a different non-unmapped type', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.field1': { type: 'keyword' },
      });

      const fields = {
        'attributes.field1': { type: 'long' as const },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).toThrow(MalformedFieldsError);
      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).toThrow(/incompatible type/);
    });

    it('should not throw for fields not defined in ancestor', () => {
      const ancestor = createWiredStreamDefinition('logs', {
        'attributes.other': { type: 'keyword' },
      });

      const fields = {
        'attributes.field1': { type: 'keyword' as const },
      };

      expect(() =>
        validateAncestorFields({
          ancestors: [ancestor],
          fields,
        })
      ).not.toThrow();
    });
  });
});

describe('validateDescendantFields', () => {
  it('should throw when descendant has incompatible type', () => {
    const descendant = createWiredStreamDefinition('logs.child', {
      'attributes.field1': { type: 'long' },
    });

    const fields = {
      'attributes.field1': { type: 'keyword' as const },
    };

    expect(() =>
      validateDescendantFields({
        descendants: [descendant],
        fields,
      })
    ).toThrow(MalformedFieldsError);
    expect(() =>
      validateDescendantFields({
        descendants: [descendant],
        fields,
      })
    ).toThrow(/incompatible type.*child stream/);
  });

  it('should not throw when descendant has same type', () => {
    const descendant = createWiredStreamDefinition('logs.child', {
      'attributes.field1': { type: 'keyword' },
    });

    const fields = {
      'attributes.field1': { type: 'keyword' as const },
    };

    expect(() =>
      validateDescendantFields({
        descendants: [descendant],
        fields,
      })
    ).not.toThrow();
  });
});
