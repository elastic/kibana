/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { Validator } from '@cfworker/json-schema';
import type { ApiRegistry, ApiRegistryMeta } from '@elastic/schemas/es/tools/types.js';
import type { HttpSelfFetchQuery } from '@kbn/core-http-server';
import { z } from '@kbn/zod/v4';

// The backend an API tool targets.
export const targetSchema = z.enum(['elasticsearch', 'kibana']);
export type ApiTarget = z.infer<typeof targetSchema>;

export type { ApiRegistry, ApiRegistryMeta };
export type LoadedApi = Awaited<ReturnType<ApiRegistry['loadApi']>>;
export type ApiRegistryDefinition = LoadedApi['definition'];
export type ApiRequest = ReturnType<LoadedApi['buildRequest']>;

let registriesPromise: Promise<Record<ApiTarget, ApiRegistry>> | undefined;

/**
 * Lazily imports the `@elastic/schemas` tool registries and returns them keyed
 * by {@link ApiTarget}.
 *
 */
export const getRegistries = (): Promise<Record<ApiTarget, ApiRegistry>> => {
  if (!registriesPromise) {
    registriesPromise = Promise.all([
      import('@elastic/schemas/es/tools/index.js'),
      import('@elastic/schemas/kibana/tools/index.js'),
    ]).then(([esTools, kibanaTools]) => ({
      elasticsearch: esTools.esRegistry,
      kibana: kibanaTools.kibanaRegistry,
    }));
  }
  return registriesPromise;
};

export const isUnknownApiError = (err: unknown): err is Error =>
  err instanceof Error && err.name === 'UnknownApiError';
export const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

export type QueryScalar = Exclude<HttpSelfFetchQuery[string], unknown[]>;
export const isQueryScalar = (value: unknown): value is QueryScalar =>
  value === undefined ||
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const isQueryArrayMember = (value: unknown): value is Exclude<QueryScalar, null | undefined> =>
  value != null && isQueryScalar(value);

/**
 * Finds query parameters holding a value a query string cannot carry.
 *
 * @param queryParams - Query parameters (as returned by an API's `buildRequest`).
 * @returns The names of parameters that are neither a scalar nor an array of non-nullish scalars.
 */
export const getUnusableQueryParams = (queryParams: Record<string, unknown> = {}): string[] =>
  Object.entries(queryParams)
    .filter(([, value]) =>
      Array.isArray(value) ? !value.every(isQueryArrayMember) : !isQueryScalar(value)
    )
    .map(([key]) => key);

/**
 * Explains why an API cannot be called at all, for the cases the tools refuse up front rather
 * than letting the request fail against the server.
 *
 * @param definition - The API's registry definition.
 * @returns The reason the API is unsupported, or `undefined` when it can be called.
 */
export const getUnsupportedReason = (definition: ApiRegistryDefinition): string | undefined =>
  definition.bodyFormat === 'ndjson'
    ? 'This API takes a newline-delimited (NDJSON) request body. The generated schemas do not model ' +
      'that payload as a parameter, so there is no way to supply one.'
    : undefined;

const jsonDirByTarget: Record<ApiTarget, string> = {
  elasticsearch: 'es',
  kibana: 'kibana',
};

const sharedSchemaFilePattern = /^[\w.-]+\.json$/;

export interface ParamsValidationError {
  path: string;
  message: string;
}

export type ParamsValidator = (params: Record<string, unknown>) => ParamsValidationError[];

const collectSchemaRefs = (node: unknown, found: Set<string>): void => {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectSchemaRefs(item, found);
    }
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      const [file] = value.split('#');
      if (file.length > 0) {
        found.add(file);
      }
    } else {
      collectSchemaRefs(value, found);
    }
  }
};

const loadSharedSchema = async (
  target: ApiTarget,
  ref: string
): Promise<Record<string, unknown>> => {
  const file = ref.replace(/^\.\//, '');
  if (!sharedSchemaFilePattern.test(file)) {
    throw new Error(`Unsupported schema reference "${ref}"`);
  }

  const imported: unknown = await import(
    `@elastic/schemas/${jsonDirByTarget[target]}/json/${file}`
  );
  const schema = isRecord(imported) ? imported.default : undefined;
  if (!isRecord(schema)) {
    throw new Error(`Schema reference "${ref}" is not a JSON Schema document`);
  }
  return schema;
};

const loadSchemaClosure = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<Map<string, Record<string, unknown>>> => {
  const closure = new Map<string, Record<string, unknown>>();
  const pending = new Set<string>();
  collectSchemaRefs(schema, pending);

  while (pending.size > 0) {
    const refs = Array.from(pending);
    pending.clear();

    const loaded = await Promise.all(refs.map((ref) => loadSharedSchema(target, ref)));

    loaded.forEach((sharedSchema, index) => {
      closure.set(refs[index], sharedSchema);
      const nested = new Set<string>();
      collectSchemaRefs(sharedSchema, nested);
      nested.forEach((ref) => {
        if (!closure.has(ref)) {
          pending.add(ref);
        }
      });
    });
  }

  return closure;
};

const buildValidator = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<Validator> => {
  const validator = new Validator(schema, '2020-12', false);
  const closure = await loadSchemaClosure(target, schema);

  for (const [ref, sharedSchema] of closure) {
    validator.addSchema(sharedSchema, ref);
  }

  return validator;
};

const validatorCache: Record<ApiTarget, Map<object, Promise<Validator>>> = {
  elasticsearch: new Map(),
  kibana: new Map(),
};

/**
 * Builds the params validator for an API, memoized per `input` schema so the shared
 * referenced files are only loaded once per API.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The API's `input` JSON Schema.
 * @returns A validator returning one error per problem found, empty when the params are valid.
 * @throws {Error} when the schema, or a schema it references, cannot be loaded.
 */
export const getValidator = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<ParamsValidator> => {
  const cache = validatorCache[target];

  let pending = cache.get(schema);
  if (!pending) {
    pending = buildValidator(target, schema).catch((error) => {
      cache.delete(schema);
      throw error;
    });
    cache.set(schema, pending);
  }

  const validator = await pending;
  const knownParams = new Set(Object.keys(isRecord(schema.properties) ? schema.properties : {}));

  return (params) => {
    // `buildRequest` forwards unrecognized keys to the querystring, so an unknown top-level param
    // has to be caught here or it reaches the API in the wrong place.
    const errors: ParamsValidationError[] = Object.keys(params)
      .filter((key) => !knownParams.has(key))
      .map((key) => ({
        path: `#/${key}`,
        message: `Unknown parameter "${key}". It is not accepted by this API.`,
      }));

    const { valid, errors: schemaErrors } = validator.validate(params);
    if (!valid) {
      errors.push(
        ...schemaErrors.map(({ instanceLocation, error }) => ({
          path: instanceLocation,
          message: error,
        }))
      );
    }

    return errors;
  };
};

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
 * Turns an API's `input` schema into the self-contained document `describe` shows the model.
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
