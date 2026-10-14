/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { isRecord } from './types';

const jsonDirByTarget: Record<ApiTarget, string> = {
  elasticsearch: 'es',
  kibana: 'kibana',
};

const sharedSchemaFilePattern = /^[\w.-]+\.json$/;

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

type SchemaClosure = Map<string, Record<string, unknown>>;

const buildSchemaClosure = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<SchemaClosure> => {
  const closure: SchemaClosure = new Map();
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

const getClosureLoader = (target: ApiTarget) => {
  const load = memoize(
    (schema: Record<string, unknown>): Promise<SchemaClosure> =>
      buildSchemaClosure(target, schema).catch((error) => {
        load.cache.delete(schema);
        throw error;
      })
  );
  return load;
};

const closureLoaders: Record<
  ApiTarget,
  (schema: Record<string, unknown>) => Promise<SchemaClosure>
> = {
  elasticsearch: getClosureLoader('elasticsearch'),
  kibana: getClosureLoader('kibana'),
};

/**
 * Loads every shared schema file an API's schema reaches, transitively.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The schema to walk, typically an API's `input`.
 * @returns The loaded documents keyed by the reference that pointed at them.
 * @throws {Error} when a reference escapes the schemas package or names a file that is not a
 * JSON Schema document.
 */
export const loadSchemaClosure = (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<SchemaClosure> => closureLoaders[target](schema);
