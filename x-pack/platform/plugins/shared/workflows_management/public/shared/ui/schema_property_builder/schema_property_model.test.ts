/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyTypeChange,
  createEmptySchemaProperty,
  findStepsReferencingInput,
  isBuilderEditableSchema,
  parseInputsToSchemaProperties,
  schemaPropertiesToJsonSchema,
  validateSchemaPropertyName,
} from './schema_property_model';

describe('schema_property_model', () => {
  describe('validateSchemaPropertyName', () => {
    it('rejects empty, invalid, and duplicate names', () => {
      const a = createEmptySchemaProperty({ name: 'alpha' });
      const b = createEmptySchemaProperty({ name: 'beta' });
      expect(validateSchemaPropertyName('', [a, b], 'x')).toBe('empty');
      expect(validateSchemaPropertyName('1bad', [a, b], 'x')).toBe('invalid');
      expect(validateSchemaPropertyName('alpha', [a, b], 'x')).toBe('duplicate');
      expect(validateSchemaPropertyName('alpha', [a, b], a.id)).toBeNull();
      expect(validateSchemaPropertyName('good_name', [a, b], 'x')).toBeNull();
    });

    it('rejects __proto__ but allows other names that exist on Object.prototype', () => {
      expect(validateSchemaPropertyName('__proto__', [], 'x')).toBe('reserved');
      expect(validateSchemaPropertyName('  __proto__  ', [], 'x')).toBe('reserved');
      expect(validateSchemaPropertyName('constructor', [], 'x')).toBeNull();
      expect(validateSchemaPropertyName('toString', [], 'x')).toBeNull();
    });

    it('only needs the id and name of its siblings', () => {
      expect(validateSchemaPropertyName('alpha', [{ id: 'a', name: 'alpha' }], 'x')).toBe(
        'duplicate'
      );
    });
  });

  describe('type change', () => {
    it('resets required, default and allowed values', () => {
      const field = createEmptySchemaProperty({
        required: true,
        hasDefault: true,
        defaultValue: 'hi',
        type: 'string',
        allowedValues: ['a'],
      });
      expect(applyTypeChange(field, 'number')).toEqual(
        expect.objectContaining({
          type: 'number',
          required: false,
          hasDefault: false,
          defaultValue: '',
          allowedValues: [],
        })
      );
    });
  });

  describe('JSON Schema round-trip', () => {
    it('serializes required as a parent-level array without per-field default', () => {
      const fields = [
        createEmptySchemaProperty({
          name: 'hostname',
          type: 'string',
          required: true,
          description: 'Host',
        }),
        createEmptySchemaProperty({
          name: 'severity',
          type: 'string',
          hasDefault: true,
          allowedValues: ['low', 'high'],
          allowOtherValues: false,
          defaultValue: 'low',
        }),
        createEmptySchemaProperty({
          name: 'note',
          type: 'string',
        }),
      ];
      const schema = schemaPropertiesToJsonSchema(fields);
      // TODO: confirm inputs schema shape
      expect(schema.required).toEqual(['hostname']);
      expect(schema.properties?.hostname).toMatchObject({
        type: 'string',
        description: 'Host',
      });
      expect(schema.properties?.hostname).not.toHaveProperty('default');
      expect(schema.properties?.severity).toMatchObject({
        type: 'string',
        enum: ['low', 'high'],
        default: 'low',
      });
      expect(schema.properties?.note).not.toHaveProperty('default');
      expect(schema.required).not.toContain('note');
      expect(schema.required).not.toContain('severity');
    });

    it('parses legacy array inputs into builder fields', () => {
      const parsed = parseInputsToSchemaProperties([
        { name: 'dry_run', type: 'boolean', required: true },
        { name: 'env', type: 'choice', options: ['dev', 'prod'], default: 'dev' },
      ]);
      expect(parsed).not.toBe('unsupported');
      if (parsed === 'unsupported') return;
      expect(parsed.map((p) => p.name)).toEqual(['dry_run', 'env']);
      expect(parsed[0]).toMatchObject({ required: true, hasDefault: false });
      expect(parsed[1]).toMatchObject({ required: false, hasDefault: true });
      expect(parsed[1].allowedValues).toEqual(['dev', 'prod']);
      expect(parsed[1].defaultValue).toBe('dev');
    });

    describe('required and default are independent', () => {
      const roundTrip = (inputs: unknown) => {
        const parsed = parseInputsToSchemaProperties(inputs);
        if (parsed === 'unsupported') throw new Error('unsupported');
        return { parsed, schema: schemaPropertiesToJsonSchema(parsed) };
      };

      it('keeps a field that is both required and has a default', () => {
        const { parsed, schema } = roundTrip({
          type: 'object',
          properties: { rule_id: { type: 'string', default: 'abc' } },
          required: ['rule_id'],
        });

        expect(parsed[0]).toMatchObject({ required: true, hasDefault: true, defaultValue: 'abc' });
        expect(schema.required).toEqual(['rule_id']);
        expect(schema.properties?.rule_id).toMatchObject({ default: 'abc' });
      });

      it('keeps an empty-string default of a string', () => {
        const { parsed, schema } = roundTrip({
          type: 'object',
          properties: { agent_id: { type: 'string', default: '' } },
        });

        expect(parsed[0]).toMatchObject({ required: false, hasDefault: true, defaultValue: '' });
        expect(schema.properties?.agent_id).toMatchObject({ type: 'string', default: '' });
        expect(schema.required).toBeUndefined();
      });

      it('writes no default while the default is not enabled, whatever the text', () => {
        const field = createEmptySchemaProperty({ name: 'a', defaultValue: 'left over' });

        expect(schemaPropertiesToJsonSchema([field]).properties?.a).not.toHaveProperty('default');
      });

      it('does not write an empty default for a type that cannot hold it', () => {
        const field = createEmptySchemaProperty({ name: 'n', type: 'number', hasDefault: true });

        expect(schemaPropertiesToJsonSchema([field]).properties?.n).not.toHaveProperty('default');
      });
    });

    describe('legacy array inputs', () => {
      const legacyUnion = { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] };
      const legacyInputs = [
        { name: 'ids', type: 'array', default: ['a', 'b'] },
        { name: 'dry_run', type: 'boolean' },
      ];

      it('opens a legacy `array` input in the form instead of the raw editor', () => {
        const parsed = parseInputsToSchemaProperties(legacyInputs);

        expect(parsed).not.toBe('unsupported');
        if (parsed === 'unsupported') return;
        expect(parsed.map((p) => p.name)).toEqual(['ids', 'dry_run']);
        expect(parsed[0]).toMatchObject({ type: 'array', itemType: 'string', hasDefault: true });
        expect(parsed[0].defaultValue).toBe('["a","b"]');
      });

      it('writes the item types back unchanged when the field is not edited', () => {
        const parsed = parseInputsToSchemaProperties(legacyInputs);
        if (parsed === 'unsupported') throw new Error('expected editable inputs');

        const schema = schemaPropertiesToJsonSchema(parsed);

        expect(schema.properties?.ids).toMatchObject({ type: 'array', items: legacyUnion });
      });

      it('replaces the union once the item type is chosen', () => {
        const parsed = parseInputsToSchemaProperties(legacyInputs);
        if (parsed === 'unsupported') throw new Error('expected editable inputs');

        const schema = schemaPropertiesToJsonSchema([
          { ...parsed[0], itemType: 'number', itemSchema: undefined },
        ]);

        expect(schema.properties?.ids).toMatchObject({ items: { type: 'number' } });
      });

      it('does not bring the union back after the property type is changed and changed back', () => {
        const parsed = parseInputsToSchemaProperties(legacyInputs);
        if (parsed === 'unsupported') throw new Error('expected editable inputs');

        const asString = applyTypeChange(parsed[0], 'string');
        const backToArray = applyTypeChange(asString, 'array');

        expect(schemaPropertiesToJsonSchema([backToArray]).properties?.ids).toMatchObject({
          items: { type: 'string' },
        });
      });

      it('still sends other compositions to the raw editor', () => {
        // A union on the property itself, a union of non-scalar types, a scalar union with constraints, `oneOf`.
        const unsupported: unknown[] = [
          { properties: { v: { anyOf: [{ type: 'string' }, { type: 'number' }] } } },
          { properties: { v: { type: 'array', items: { anyOf: [{ type: 'object' }] } } } },
          {
            properties: {
              v: { type: 'array', items: { anyOf: [{ type: 'string', minLength: 2 }] } },
            },
          },
          { properties: { v: { type: 'array', items: { oneOf: [{ type: 'string' }] } } } },
        ];

        unsupported.forEach((schema) => {
          expect(parseInputsToSchemaProperties(schema)).toBe('unsupported');
        });
      });
    });

    it('marks $ref schemas as unsupported for the builder', () => {
      expect(
        isBuilderEditableSchema({
          properties: { payload: { $ref: '#/kibana/definitions/notificationGroup' } },
        })
      ).toBe(false);
      expect(parseInputsToSchemaProperties({ properties: { payload: { $ref: '#/x' } } })).toBe(
        'unsupported'
      );
    });
  });

  describe('findStepsReferencingInput', () => {
    it('returns step names that reference the input', () => {
      const yaml = `
steps:
  - name: notify
    type: console
    with:
      message: "{{ inputs.hostname }}"
  - name: other
    type: console
    with:
      message: plain
`;
      expect(findStepsReferencingInput(yaml, 'hostname')).toEqual(['notify']);
      expect(findStepsReferencingInput(yaml, 'missing')).toEqual([]);
    });
  });

  describe('schemaPropertiesToJsonSchema with names found on Object.prototype', () => {
    it('keeps constructor, toString and __proto__ as own keys without touching the prototype', () => {
      const names = ['constructor', 'toString', '__proto__'];
      const schema = schemaPropertiesToJsonSchema(
        names.map((name) => createEmptySchemaProperty({ name, required: true }))
      );

      const { properties, required } = schema;
      expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
      expect(Object.keys(properties ?? {})).toEqual(names);
      names.forEach((name) => {
        expect(Object.prototype.hasOwnProperty.call(properties, name)).toBe(true);
      });
      expect(required).toEqual(names);
    });

    it('round-trips such names through parse', () => {
      const names = ['constructor', 'toString'];
      const schema = schemaPropertiesToJsonSchema(
        names.map((name) => createEmptySchemaProperty({ name }))
      );
      const parsed = parseInputsToSchemaProperties(schema);
      expect(Array.isArray(parsed) ? parsed.map((field) => field.name) : parsed).toEqual(names);
    });

    it('keeps nested object properties with these names as own keys', () => {
      const schema = schemaPropertiesToJsonSchema([
        createEmptySchemaProperty({
          name: 'parent',
          type: 'object',
          properties: [createEmptySchemaProperty({ name: '__proto__' })],
        }),
      ]);
      const nested = schema.properties?.parent.properties;
      expect(Object.keys(nested ?? {})).toEqual(['__proto__']);
      expect(Object.getPrototypeOf(nested)).toBe(Object.prototype);
    });
  });
});
