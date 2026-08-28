/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ConversationTemplateFieldDefinition } from '@kbn/agent-builder-common';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

/**
 * Cache compiled schemas by the definition object identity.
 * Template definition objects come from the in-memory registry and are stable
 * (never mutated after registration), so each field compiles exactly once per
 * process lifetime.
 */
const cache = new WeakMap<ConversationTemplateFieldDefinition, z.ZodType>();

/**
 * Builds a zod schema for a single field definition.
 *
 * The recursion is over the (finite) `properties` tree declared by the template
 * author, so `z.lazy` is not needed — the tree is fully traversed once at compile
 * time and the resulting schemas are memoized.
 *
 * For OBJECT fields the schema uses `z.strictObject` so that any key not declared
 * in `properties` is rejected — mirroring the top-level "field is not declared in
 * template" rule that `validateMetadataUpdate` enforces.
 */
export const compileFieldSchema = (def: ConversationTemplateFieldDefinition): z.ZodType => {
  const cached = cache.get(def);
  if (cached) return cached;

  const schema = buildSchema(def);
  cache.set(def, schema);
  return schema;
};

const buildSchema = (def: ConversationTemplateFieldDefinition): z.ZodType => {
  switch (def.input_type) {
    case 'TEXT':
    case 'USER': {
      let s: z.ZodString = z.string();
      if (def.max_length !== undefined) s = s.max(def.max_length);
      if (def.regex) {
        const re = new RegExp(def.regex.pattern);
        s = s.regex(re, def.regex.message);
      }
      return s;
    }

    case 'SELECT': {
      // options is validated as non-empty at registration time, so we can assert here.
      const options = (def.options ?? []) as [string, ...string[]];
      let s: z.ZodType = z.enum(options);
      if (def.regex) {
        const re = new RegExp(def.regex.pattern);
        // z.enum already restricts to options; add regex as an additional check.
        s = s.refine((v) => re.test(v as string), def.regex.message);
      }
      return s;
    }

    case 'NUMBER': {
      let s: z.ZodNumber = z.number();
      if (def.min !== undefined) s = s.gte(def.min);
      if (def.max !== undefined) s = s.lte(def.max);
      return s;
    }

    case 'DATE': {
      return z.string().refine((v) => ISO_DATE_RE.test(v) && !Number.isNaN(Date.parse(v)), {
        message: 'Not a valid ISO 8601 date',
      });
    }

    case 'TOGGLE': {
      return z.boolean();
    }

    case 'TEXT_ARRAY': {
      let itemSchema: z.ZodString = z.string();
      if (def.max_length !== undefined) itemSchema = itemSchema.max(def.max_length);
      return z.array(itemSchema);
    }

    case 'OBJECT': {
      return buildObjectSchema(def);
    }

    case 'OBJECT_ARRAY': {
      const objectSchema = buildObjectSchema(def);
      let s = z.array(objectSchema);
      if (def.max_items !== undefined) s = s.max(def.max_items);
      return s;
    }

    default: {
      // Unreachable for well-formed templates (validateTemplateDefinition catches
      // unknown types at registration), but provides a safe fallback.
      return z.unknown();
    }
  }
};

const buildObjectSchema = (def: ConversationTemplateFieldDefinition): z.ZodType => {
  const shape: Record<string, z.ZodType> = {};

  for (const [propName, propDef] of Object.entries(def.properties ?? {})) {
    const propSchema = compileFieldSchema(propDef);
    // A nested field is optional unless it declares `required: true`.
    shape[propName] = propDef.required ? propSchema : propSchema.optional();
  }

  // z.strictObject rejects keys not listed in `shape`, mirroring the top-level
  // "field not declared in template" enforcement from validateMetadataUpdate.
  return z.strictObject(shape);
};
