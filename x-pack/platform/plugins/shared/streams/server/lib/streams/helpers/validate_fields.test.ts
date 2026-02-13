/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import { namespacePrefixes } from '@kbn/streams-schema';
import {
  validateAncestorFields,
  validateDescendantFields,
  validateSystemFields,
  validateClassicFields,
} from './validate_fields';
import { MalformedFieldsError } from '../errors/malformed_fields_error';

const createWiredStreamDefinition = (
  name: string,
  fields: FieldDefinition
): Streams.WiredStream.Definition => ({
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    failure_store: { inherit: {} },
    wired: {
      fields,
      routing: [],
    },
  },
});

describe('validateAncestorFields', () => {
  describe('namespace prefix validation', () => {
    it('should accept fields with valid namespace prefixes', () => {
      for (const prefix of namespacePrefixes) {
        const fieldName = `${prefix}custom_field`;
        const ancestors = [createWiredStreamDefinition('logs', {})];
        const fields: FieldDefinition = {
          [fieldName]: { type: 'keyword' },
        };

        expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
      }
    });

    it('should accept resource.attributes prefixed fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'resource.attributes.service.name': { type: 'keyword' },
        'resource.attributes.host.name': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept attributes prefixed fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'attributes.custom': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept scope.attributes prefixed fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'scope.attributes.library': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept body.structured prefixed fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'body.structured.message': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should reject fields without valid namespace prefix or not in keepFields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        invalid_field: { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
        "Field invalid_field is not allowed to be defined as it doesn't match the namespaced ECS or OTel schema."
      );
    });
  });

  describe('keepFields validation', () => {
    // Note: Some fields in keepFields (body, scope, resource) are also in baseMappings,
    // which means they're rejected because they're automatic aliases in otel compat mode.
    // This test verifies the fields that ARE allowed (not in baseMappings).
    const fieldsAllowedByKeepFieldsNotInBaseMappings = [
      '@timestamp',
      'observed_timestamp',
      'trace_id',
      'span_id',
      'severity_text',
      'severity_number',
      'event_name',
      'dropped_attributes_count',
      'scope.name',
      'body.text',
      'body.structured',
      'resource.schema_url',
      'resource.dropped_attributes_count',
    ];

    it('should accept keepFields that are not otel base mapping aliases', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];

      for (const fieldName of fieldsAllowedByKeepFieldsNotInBaseMappings) {
        const fields: FieldDefinition = {
          [fieldName]: { type: 'keyword' },
        };

        expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
      }
    });

    it('should reject keepFields that conflict with baseMappings (otel aliases)', () => {
      // Fields like 'body', 'scope' are in both keepFields and baseMappings
      // They pass the namespace/keepFields check but get rejected by baseMappings check
      const ancestors = [createWiredStreamDefinition('logs', {})];

      // Only 'body' and 'scope' are in both keepFields AND baseMappings
      const fieldsInBothKeepFieldsAndBaseMappings = ['body', 'scope'];
      for (const fieldName of fieldsInBothKeepFieldsAndBaseMappings) {
        const fields: FieldDefinition = {
          [fieldName]: { type: 'keyword' },
        };

        expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
        expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
          `Field ${fieldName} is an automatic alias of another field because of otel compat mode`
        );
      }
    });

    it('should reject fields that are only in baseMappings but not in keepFields', () => {
      // Fields like 'resource' and 'attributes' are in baseMappings but NOT in keepFields
      // They fail the namespace check first (before even reaching baseMappings check)
      const ancestors = [createWiredStreamDefinition('logs', {})];

      const fieldsOnlyInBaseMappings = ['resource', 'attributes'];
      for (const fieldName of fieldsOnlyInBaseMappings) {
        const fields: FieldDefinition = {
          [fieldName]: { type: 'keyword' },
        };

        expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
        expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
          `Field ${fieldName} is not allowed to be defined as it doesn't match the namespaced ECS or OTel schema.`
        );
      }
    });

    it('should accept scope.name (OTel pre-mapped field)', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'scope.name': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept @timestamp field', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        '@timestamp': { type: 'date' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept trace_id and span_id fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        trace_id: { type: 'keyword' },
        span_id: { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept body.text and body.structured fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      // Note: body.structured is typically a passthrough/object in baseMappings,
      // but in field definitions it needs a valid FieldDefinitionType
      const fields: FieldDefinition = {
        'body.text': { type: 'match_only_text' },
        'body.structured': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept severity fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        severity_text: { type: 'keyword' },
        severity_number: { type: 'byte' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should accept resource metadata fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'resource.schema_url': { type: 'keyword' },
        'resource.dropped_attributes_count': { type: 'integer' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });
  });

  describe('ancestor type conflict detection', () => {
    it('should throw when field type conflicts with ancestor', () => {
      const ancestors = [
        createWiredStreamDefinition('logs', {
          'attributes.level': { type: 'keyword' },
        }),
      ];
      const fields: FieldDefinition = {
        'attributes.level': { type: 'long' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
        'Field attributes.level is already defined with incompatible type in the parent stream logs'
      );
    });

    it('should allow same field with same type as ancestor', () => {
      const ancestors = [
        createWiredStreamDefinition('logs', {
          'attributes.level': { type: 'keyword' },
        }),
      ];
      const fields: FieldDefinition = {
        'attributes.level': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should check all ancestors for type conflicts', () => {
      const ancestors = [
        createWiredStreamDefinition('logs', {}),
        createWiredStreamDefinition('logs.otel', {
          'attributes.service': { type: 'keyword' },
        }),
      ];
      const fields: FieldDefinition = {
        'attributes.service': { type: 'text' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
        'Field attributes.service is already defined with incompatible type in the parent stream logs.otel'
      );
    });
  });

  describe('otel alias conflict detection', () => {
    it('should reject field if prefixed version exists in current fields', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        'scope.name': { type: 'keyword' },
        'body.structured.scope.name': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
        'Field scope.name is an automatic alias of body.structured.scope.name because of otel compat mode'
      );
    });

    it('should reject field if prefixed version exists in ancestor', () => {
      const ancestors = [
        createWiredStreamDefinition('logs', {
          'attributes.trace_id': { type: 'keyword' },
        }),
      ];
      const fields: FieldDefinition = {
        trace_id: { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(MalformedFieldsError);
      expect(() => validateAncestorFields({ ancestors, fields })).toThrow(
        'Field trace_id is an automatic alias of attributes.trace_id because of otel compat mode'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty ancestors array', () => {
      const ancestors: Streams.WiredStream.Definition[] = [];
      const fields: FieldDefinition = {
        'attributes.custom': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should handle empty fields object', () => {
      const ancestors = [createWiredStreamDefinition('logs', { 'attributes.x': { type: 'long' } })];
      const fields: FieldDefinition = {};

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });

    it('should handle multiple valid fields simultaneously', () => {
      const ancestors = [createWiredStreamDefinition('logs', {})];
      const fields: FieldDefinition = {
        '@timestamp': { type: 'date' },
        'scope.name': { type: 'keyword' },
        trace_id: { type: 'keyword' },
        'resource.attributes.service.name': { type: 'keyword' },
        'attributes.custom': { type: 'keyword' },
      };

      expect(() => validateAncestorFields({ ancestors, fields })).not.toThrow();
    });
  });
});

describe('validateDescendantFields', () => {
  it('should throw when field type conflicts with descendant', () => {
    const descendants = [
      createWiredStreamDefinition('logs.child', {
        'attributes.level': { type: 'keyword' },
      }),
    ];
    const fields: FieldDefinition = {
      'attributes.level': { type: 'long' },
    };

    expect(() => validateDescendantFields({ descendants, fields })).toThrow(MalformedFieldsError);
    expect(() => validateDescendantFields({ descendants, fields })).toThrow(
      'Field attributes.level is already defined with incompatible type in the child stream logs.child'
    );
  });

  it('should allow same field with same type as descendant', () => {
    const descendants = [
      createWiredStreamDefinition('logs.child', {
        'attributes.level': { type: 'keyword' },
      }),
    ];
    const fields: FieldDefinition = {
      'attributes.level': { type: 'keyword' },
    };

    expect(() => validateDescendantFields({ descendants, fields })).not.toThrow();
  });

  it('should check all descendants for type conflicts', () => {
    const descendants = [
      createWiredStreamDefinition('logs.child1', {}),
      createWiredStreamDefinition('logs.child2', {
        'attributes.service': { type: 'keyword' },
      }),
    ];
    const fields: FieldDefinition = {
      'attributes.service': { type: 'text' },
    };

    expect(() => validateDescendantFields({ descendants, fields })).toThrow(MalformedFieldsError);
    expect(() => validateDescendantFields({ descendants, fields })).toThrow(
      'Field attributes.service is already defined with incompatible type in the child stream logs.child2'
    );
  });

  it('should handle empty descendants array', () => {
    const descendants: Streams.WiredStream.Definition[] = [];
    const fields: FieldDefinition = {
      'attributes.custom': { type: 'keyword' },
    };

    expect(() => validateDescendantFields({ descendants, fields })).not.toThrow();
  });

  it('should handle empty fields object', () => {
    const descendants = [
      createWiredStreamDefinition('logs.child', { 'attributes.x': { type: 'long' } }),
    ];
    const fields: FieldDefinition = {};

    expect(() => validateDescendantFields({ descendants, fields })).not.toThrow();
  });
});

describe('validateSystemFields', () => {
  it('should allow system fields on root stream', () => {
    const definition = createWiredStreamDefinition('logs', {
      '@timestamp': { type: 'system' as any },
    });

    expect(() => validateSystemFields(definition)).not.toThrow();
  });

  it('should throw for system fields on child stream', () => {
    const definition = createWiredStreamDefinition('logs.child', {
      'attributes.custom': { type: 'system' as any },
    });

    expect(() => validateSystemFields(definition)).toThrow(MalformedFieldsError);
    expect(() => validateSystemFields(definition)).toThrow(
      'Stream logs.child is not allowed to have system fields'
    );
  });

  it('should allow non-system fields on child stream', () => {
    const definition = createWiredStreamDefinition('logs.child', {
      'attributes.custom': { type: 'keyword' },
    });

    expect(() => validateSystemFields(definition)).not.toThrow();
  });
});

describe('validateClassicFields', () => {
  const createClassicStreamDefinition = (
    name: string,
    fieldOverrides?: Record<string, { type: string }>
  ): Streams.ClassicStream.Definition =>
    ({
      name,
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        failure_store: { inherit: {} },
        classic: {
          field_overrides: fieldOverrides,
        },
      },
    } as Streams.ClassicStream.Definition);

  it('should throw for system fields in classic stream', () => {
    const definition = createClassicStreamDefinition('metrics-custom', {
      'custom.field': { type: 'system' },
    });

    expect(() => validateClassicFields(definition)).toThrow(MalformedFieldsError);
    expect(() => validateClassicFields(definition)).toThrow(
      'Stream metrics-custom is not allowed to have system fields'
    );
  });

  it('should allow non-system fields in classic stream', () => {
    const definition = createClassicStreamDefinition('metrics-custom', {
      'custom.field': { type: 'keyword' },
    });

    expect(() => validateClassicFields(definition)).not.toThrow();
  });

  it('should handle undefined field_overrides', () => {
    const definition = createClassicStreamDefinition('metrics-custom');

    expect(() => validateClassicFields(definition)).not.toThrow();
  });
});
