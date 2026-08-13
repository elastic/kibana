/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadSchemaClosure } from './schema_closure';
import { isRecord } from './types';
import type { ApiTarget } from './types';

// Character limit for inline definitions
const MAX_INLINED_DEFINITION_CHARS = 1_200;

// Total budget for the inlined `$defs` block of a single schema
const MAX_INLINED_TOTAL_CHARS = 12_000;

const DEFINITION_POINTER_PREFIX = '/$defs/';

interface DefinitionRef {
  file: string;
  name: string;
}

const parseDefinitionRef = (ref: string): DefinitionRef | undefined => {
  const [file, pointer] = ref.split('#');
  if (!file || !pointer?.startsWith(DEFINITION_POINTER_PREFIX)) {
    return undefined;
  }
  return { file, name: pointer.slice(DEFINITION_POINTER_PREFIX.length) };
};

const ROUTING_LOCATION_KEY = 'x-found-in';

const buildDescribedSchema = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const closure = await loadSchemaClosure(target, schema);
  const definitions: Record<string, unknown> = {};
  let remainingChars = MAX_INLINED_TOTAL_CHARS;

  const lookup = (parsed: DefinitionRef): Record<string, unknown> | undefined => {
    const document = closure.get(parsed.file);
    const defs = isRecord(document?.$defs) ? document.$defs : undefined;
    const definition = defs?.[parsed.name];
    return isRecord(definition) ? definition : undefined;
  };

  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(rewrite);
    }
    if (!isRecord(node)) {
      return node;
    }

    const siblings = Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => key !== '$ref' && key !== ROUTING_LOCATION_KEY)
        .map(([key, value]) => [key, rewrite(value)] as const)
    );

    const { $ref: ref } = node;
    if (typeof ref !== 'string') {
      return siblings;
    }

    const parsed = parseDefinitionRef(ref);
    const definition = parsed && lookup(parsed);
    if (!parsed || !definition) {
      return { ...siblings, $ref: ref };
    }

    const localPointer = `#${DEFINITION_POINTER_PREFIX}${parsed.name}`;
    if (parsed.name in definitions) {
      return { ...siblings, $ref: localPointer };
    }

    const size = JSON.stringify(definition).length;
    if (size > MAX_INLINED_DEFINITION_CHARS || size > remainingChars) {
      const { description, type } = definition;
      return {
        ...(type === undefined ? {} : { type }),
        title: parsed.name,
        ...(typeof description === 'string' ? { description } : {}),
        ...siblings,
      };
    }

    remainingChars -= size;

    // Reserve the slot before recursing so a definition that reaches itself resolves to the
    // pointer instead of recursing forever.
    definitions[parsed.name] = {};
    definitions[parsed.name] = rewrite(definition);
    return { ...siblings, $ref: localPointer };
  };

  const rewritten = rewrite(schema);
  if (!isRecord(rewritten)) {
    return schema;
  }
  return Object.keys(definitions).length > 0 ? { ...rewritten, $defs: definitions } : rewritten;
};

const describedSchemaCache: Record<ApiTarget, Map<object, Promise<Record<string, unknown>>>> = {
  elasticsearch: new Map(),
  kibana: new Map(),
};

/**
 * Turns an API's `input` schema into the self-contained document `describe_api` shows the model.
 *
 * Cross-file `$ref`s are resolved locally: definitions under
 * {@link MAX_INLINED_DEFINITION_CHARS} are inlined into a `$defs` block, and larger ones are
 * reduced to their `type` and `title`.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The API's `input` JSON Schema.
 * @returns A self-contained copy of the schema, carrying no cross-file reference.
 * @throws {Error} when a referenced file cannot be loaded.
 */
export const toDescribedSchema = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const cache = describedSchemaCache[target];

  let pending = cache.get(schema);
  if (!pending) {
    pending = buildDescribedSchema(target, schema).catch((error) => {
      cache.delete(schema);
      throw error;
    });
    cache.set(schema, pending);
  }

  return pending;
};
