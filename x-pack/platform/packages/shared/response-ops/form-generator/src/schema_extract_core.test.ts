/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { extractSchemaCore } from './schema_extract_core';
import { getMeta, setMeta } from './schema_connector_metadata';
import type { ResolvedMetaFunctions } from './form';

const meta: ResolvedMetaFunctions = { getMeta, setMeta };

describe('extractSchemaCore', () => {
  describe('ZodOptional unwrapping', () => {
    it('should unwrap ZodOptional and return the inner schema', () => {
      const schema = z.string().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap ZodOptional with inner number schema', () => {
      const schema = z.number().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap ZodOptional with inner boolean schema', () => {
      const schema = z.boolean().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodBoolean);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(true);
    });
  });

  describe('ZodNullable unwrapping', () => {
    it('should unwrap ZodNullable and return the inner schema', () => {
      const schema = z.string().nullable();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should unwrap ZodNullable with inner number schema', () => {
      const schema = z.number().nullable();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should unwrap ZodNullable with inner object schema', () => {
      const schema = z.object({ name: z.string() }).nullable();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodObject);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });
  });

  describe('ZodDefault extraction and unwrapping', () => {
    it('should extract default value from ZodDefault with string', () => {
      const schema = z.string().default('default-value');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with number', () => {
      const schema = z.number().default(42);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(result.defaultValue).toBe(42);
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with boolean', () => {
      const schema = z.boolean().default(true);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodBoolean);
      expect(result.defaultValue).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with object', () => {
      const defaultObj = { name: 'test', age: 30 };
      const schema = z.object({ name: z.string(), age: z.number() }).default(defaultObj);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodObject);
      expect(result.defaultValue).toEqual(defaultObj);
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with array', () => {
      const defaultArray = ['a', 'b', 'c'];
      const schema = z.array(z.string()).default(defaultArray);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodArray);
      expect(result.defaultValue).toEqual(defaultArray);
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with empty string', () => {
      const schema = z.string().default('');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('');
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with zero', () => {
      const schema = z.number().default(0);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(result.defaultValue).toBe(0);
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value from ZodDefault with false', () => {
      const schema = z.boolean().default(false);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodBoolean);
      expect(result.defaultValue).toBe(false);
      expect(result.isOptional).toBe(false);
    });
  });

  describe('ZodCatch unwrapping', () => {
    it('should unwrap ZodCatch and return the inner schema', () => {
      const schema = z.string().catch('fallback');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
    });

    it('should unwrap ZodCatch with number schema', () => {
      const schema = z.number().catch(0);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
    });

    it('should unwrap ZodCatch with object schema', () => {
      const schema = z.object({ name: z.string() }).catch({ name: 'default' });
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodObject);
    });
  });

  describe('ZodReadonly unwrapping and disabled meta addition', () => {
    it('should unwrap ZodReadonly and add disabled metadata', () => {
      const schema = z.string().readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(getMeta(result.schema).disabled).toBe(true);
    });

    it('should unwrap ZodReadonly with number schema and add disabled metadata', () => {
      const schema = z.number().readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(getMeta(result.schema).disabled).toBe(true);
    });

    it('should unwrap ZodReadonly with object schema and add disabled metadata', () => {
      const schema = z.object({ name: z.string() }).readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodObject);
      expect(getMeta(result.schema).disabled).toBe(true);
    });
  });

  describe('nested unwrapping', () => {
    it('should unwrap z.optional(z.default(...))', () => {
      const schema = z.string().default('default-value').optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap z.nullable(z.default(...))', () => {
      const schema = z.string().default('default-value').nullable();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(false);
    });

    it('should unwrap z.optional(z.nullable(...))', () => {
      const schema = z.string().nullable().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap z.optional(z.nullable(z.default(...)))', () => {
      const schema = z.string().default('default-value').nullable().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap z.readonly(z.default(...))', () => {
      const schema = z.string().default('default-value').readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(false);
      expect(getMeta(result.schema).disabled).toBe(true);
    });

    it('should unwrap z.optional(z.readonly(...))', () => {
      const schema = z.string().readonly().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(getMeta(result.schema).disabled).toBe(true);
    });

    it('should unwrap z.catch(z.default(...))', () => {
      const schema = z.string().default('default-value').catch('fallback');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(false);
    });

    it('should unwrap deeply nested wrappers', () => {
      const schema = z.string().default('default-value').nullable().optional().readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('default-value');
      expect(result.isOptional).toBe(true);
      expect(getMeta(result.schema).disabled).toBe(true);
    });

    it('should unwrap multiple optional wrappers', () => {
      // Note: This is an unusual case but should still work
      const schema = z.string().optional().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(true);
    });

    it('should unwrap complex nested structure with all wrapper types', () => {
      const schema = z.number().default(42).catch(0).nullable().optional().readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodNumber);
      expect(result.defaultValue).toBe(42);
      expect(result.isOptional).toBe(true);
      expect(getMeta(result.schema).disabled).toBe(true);
    });
  });

  describe('literal value extraction', () => {
    it('should extract string literal value', () => {
      const schema = z.literal('fixed-value');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe('fixed-value');
      expect(result.isOptional).toBe(false);
    });

    it('should extract number literal value', () => {
      const schema = z.literal(123);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe(123);
      expect(result.isOptional).toBe(false);
    });

    it('should extract boolean literal value', () => {
      const schema = z.literal(true);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should extract false literal value', () => {
      const schema = z.literal(false);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe(false);
      expect(result.isOptional).toBe(false);
    });

    it('should extract null literal value', () => {
      const schema = z.literal(null);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe(null);
      expect(result.isOptional).toBe(false);
    });

    it('should extract empty string literal value', () => {
      const schema = z.literal('');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe('');
      expect(result.isOptional).toBe(false);
    });

    it('should extract zero literal value', () => {
      const schema = z.literal(0);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe(0);
      expect(result.isOptional).toBe(false);
    });
  });

  describe('default values properly extracted during unwrapping', () => {
    it('should preserve default value when unwrapping optional', () => {
      const schema = z.string().default('my-default').optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toBe('my-default');
      expect(result.isOptional).toBe(true);
    });

    it('should preserve default value when unwrapping nullable', () => {
      const schema = z.string().default('my-default').nullable();
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toBe('my-default');
      expect(result.isOptional).toBe(false);
    });

    it('should preserve default value when unwrapping catch', () => {
      const schema = z.string().default('my-default').catch('fallback');
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toBe('my-default');
      expect(result.isOptional).toBe(false);
    });

    it('should preserve default value when unwrapping readonly', () => {
      const schema = z.string().default('my-default').readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toBe('my-default');
      expect(result.isOptional).toBe(false);
    });

    it('should extract default value even with complex nesting', () => {
      const schema = z.string().default('nested-default').nullable().optional().catch('fallback');
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toBe('nested-default');
      expect(result.isOptional).toBe(true);
    });

    it('should handle default value with function', () => {
      const schema = z.array(z.string()).default(() => ['a', 'b']);
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toEqual(['a', 'b']);
      expect(result.isOptional).toBe(false);
    });

    it('should handle default value with Date', () => {
      const defaultDate = new Date('2023-01-01');
      const schema = z.date().default(defaultDate);
      const result = extractSchemaCore(schema, meta);

      expect(result.defaultValue).toEqual(defaultDate);
      expect(result.isOptional).toBe(false);
    });
  });

  describe('order of operations when multiple wrappers exist', () => {
    it('should add disabled metadata when readonly wrapper is encountered', () => {
      const schema = z.string().default('value').readonly().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBe('value');
      expect(getMeta(result.schema).disabled).toBe(true);
      expect(result.isOptional).toBe(true);
    });

    it('should handle literal inside wrapped schema correctly', () => {
      const schema = z.literal('discriminator-value').optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe('discriminator-value');
      expect(result.isOptional).toBe(true);
    });

    it('should handle readonly at any position in the wrapper chain', () => {
      const schema1 = z.string().readonly().optional();
      const result = extractSchemaCore(schema1, meta);
      const meta1 = getMeta(result.schema);
      expect(meta1.disabled).toBe(true);
      expect(result.isOptional).toBe(true);

      const schema2 = z.string().optional().readonly();
      const result2 = extractSchemaCore(schema2, meta);
      const meta2 = getMeta(result2.schema);
      expect(meta2.disabled).toBe(true);
      expect(result2.isOptional).toBe(true);
    });

    it('should not lose default value when readonly is in the chain', () => {
      const schema1 = z.string().default('test').readonly();
      const result1 = extractSchemaCore(schema1, meta);
      expect(result1.defaultValue).toBe('test');
      expect(result1.isOptional).toBe(false);

      const schema2 = z.string().readonly().default('test');
      const result2 = extractSchemaCore(schema2, meta);
      expect(result2.defaultValue).toBe('test');
      expect(result2.isOptional).toBe(false);
    });

    it('should handle all wrappers in a complex realistic scenario', () => {
      const schema = z.literal('my-type').readonly().optional();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodLiteral);
      expect(result.defaultValue).toBe('my-type');
      expect(getMeta(result.schema).disabled).toBe(true);
      expect(result.isOptional).toBe(true);
    });

    it('should not loose meta information correctly even if before default', () => {
      const schema = z
        .discriminatedUnion('authType', [
          z.object({ authType: z.literal('none') }).meta({
            label: 'None',
          }),
        ])
        .meta({ disabled: true })
        .default({ authType: 'none' });

      const result = extractSchemaCore(schema, meta);
      expect(result.schema).toBeInstanceOf(z.ZodDiscriminatedUnion);
      expect(result.defaultValue).toEqual({ authType: 'none' });
      expect(getMeta(result.schema).disabled).toBe(true);
      expect(result.isOptional).toBe(false);
    });

    it('should not loose meta information correctly even if after default', () => {
      const schema = z
        .discriminatedUnion('authType', [
          z.object({ authType: z.literal('none') }).meta({
            label: 'None',
          }),
        ])
        .default({ authType: 'none' })
        .meta({ disabled: true });

      const result = extractSchemaCore(schema, meta);
      expect(result.schema).toBeInstanceOf(z.ZodDiscriminatedUnion);
      expect(result.defaultValue).toEqual({ authType: 'none' });
      expect(getMeta(result.schema).disabled).toBe(true);
      expect(result.isOptional).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle schema without any wrappers', () => {
      const schema = z.string();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should handle enum schema', () => {
      const schema = z.enum(['option1', 'option2', 'option3']);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodEnum);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should handle enum schema with default', () => {
      const schema = z.enum(['option1', 'option2', 'option3']).default('option2');
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodEnum);
      expect(result.defaultValue).toBe('option2');
      expect(result.isOptional).toBe(false);
    });

    it('should handle discriminated union schema', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.string() }),
        z.object({ type: z.literal('b'), value: z.number() }),
      ]);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodDiscriminatedUnion);
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should handle discriminated union schema with default', () => {
      const schema = z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('a'), value: z.string() }),
          z.object({ type: z.literal('b'), value: z.number() }),
        ])
        .default({ type: 'b', value: 3 });
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodDiscriminatedUnion);
      expect(result.defaultValue).toStrictEqual({ type: 'b', value: 3 });
      expect(result.isOptional).toBe(false);
    });

    it('should handle undefined default value', () => {
      const schema = z.string().default(undefined as any);
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      // When parsing undefined with a default schema, Zod should still return undefined if that's what's set
      expect(result.defaultValue).toBeUndefined();
      expect(result.isOptional).toBe(false);
    });

    it('should not loose the meta value when unwrapping multiple times', () => {
      const schema = z.string().optional().readonly().meta({ label: 'readonly' });
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(getMeta(result.schema).label).toBe('readonly');
      expect(getMeta(result.schema).disabled).toBe(true);
      expect(result.isOptional).toBe(true);
    });

    it('should return isOptional true when schema is optional at any level', () => {
      const schema = z.string().nullable().optional().readonly();
      const result = extractSchemaCore(schema, meta);

      expect(result.schema).toBeInstanceOf(z.ZodString);
      expect(result.isOptional).toBe(true);
      expect(result.defaultValue).toBeUndefined();
    });
  });

  describe('meta preservation after JSON Schema round-trip', () => {
    it('should preserve meta on URL field after unwrapping round-tripped schema', () => {
      const innerSchema = z.url();
      const optionalSchema = innerSchema.optional();
      const defaultSchema = optionalSchema.default('https://example.com');

      z.globalRegistry.add(defaultSchema, { label: 'Test URL', placeholder: 'https://' });

      const { schema: unwrapped } = extractSchemaCore(defaultSchema, meta);

      expect(getMeta(unwrapped).label).toBe('Test URL');
      expect(getMeta(unwrapped).placeholder).toBe('https://');
    });

    it('should preserve meta when meta exists on both wrapper and inner schema', () => {
      const innerSchema = z.string();
      z.globalRegistry.add(innerSchema, { label: 'Inner Label', sensitive: true });

      const optionalSchema = innerSchema.optional();
      z.globalRegistry.add(optionalSchema, { label: 'Wrapper Label', placeholder: 'test' });

      const { schema: unwrapped } = extractSchemaCore(optionalSchema, meta);

      const schemaMeta = getMeta(unwrapped);
      expect(schemaMeta.label).toBe('Inner Label'); // Inner wins
      expect(schemaMeta.sensitive).toBe(true); // From inner
      expect(schemaMeta.placeholder).toBe('test'); // From wrapper (not overwritten)
    });

    it('should preserve meta through multiple wrapper layers like parseObject creates', () => {
      const baseSchema = z.url();
      z.globalRegistry.add(baseSchema, { label: 'Base Label', widget: 'text' });

      const optionalSchema = baseSchema.optional();
      const defaultSchema = optionalSchema.default('https://default.com');
      z.globalRegistry.add(defaultSchema, {
        label: 'Browse URL',
        placeholder: 'https://r.jina.ai',
      });

      const { schema: unwrapped } = extractSchemaCore(defaultSchema, meta);

      const schemaMeta = getMeta(unwrapped);
      expect(schemaMeta.label).toBe('Base Label');
      expect(schemaMeta.widget).toBe('text');
      expect(schemaMeta.placeholder).toBe('https://r.jina.ai');
    });
  });
});
