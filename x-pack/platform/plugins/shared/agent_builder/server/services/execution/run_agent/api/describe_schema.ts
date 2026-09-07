/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit } from 'lodash';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { loadSchemaClosure } from './schema_closure';
import { isRecord } from './types';

// Character limit for inline definitions
const MAX_INLINED_DEFINITION_CHARS = 1_200;

// Total budget for the inlined `$defs` block of a single schema
const MAX_INLINED_TOTAL_CHARS = 12_000;

// Character limit for the child names a single stub lists
const MAX_STUB_CHILD_NAME_CHARS = 2_000;

// Total budget for the child names every stub of a single schema lists
const MAX_STUB_CHILD_NAME_TOTAL_CHARS = 8_000;

const DEFINITION_POINTER_PREFIX = '/$defs/';
const LOCAL_POINTER_PREFIX = `#${DEFINITION_POINTER_PREFIX}`;

export const EXPANDABLE_KEY = 'x-expandable';
const PROPERTY_NAMES_KEY = 'x-properties';
const UNION_BRANCH_NAMES_KEY = 'x-one-of';
const OMITTED_NAMES_KEY = 'x-omitted';
const ROUTING_LOCATION_KEY = 'x-found-in';
const SELF_POINTER = '#';

interface DefinitionRef {
  file: string;
  name: string;
}

interface ChildNames {
  key: typeof PROPERTY_NAMES_KEY | typeof UNION_BRANCH_NAMES_KEY;
  names: string[];
}

interface BudgetedNames {
  kept: string[];
  cost: number;
  omitted: number;
}

export interface DescribedSchema {
  schema: Record<string, unknown>;
  expandableTypes: string[];
}

interface DescribeOptions {
  closure: Map<string, Record<string, unknown>>;
  root: Record<string, unknown>;
  inlinedTotalChars: number;
  selfName?: string;
}

const parseDefinitionRef = (ref: string): DefinitionRef | undefined => {
  const [file, pointer] = ref.split('#');
  if (!file || !pointer?.startsWith(DEFINITION_POINTER_PREFIX)) {
    return undefined;
  }
  return { file, name: pointer.slice(DEFINITION_POINTER_PREFIX.length) };
};

const definitionIn = (
  document: Record<string, unknown> | undefined,
  name: string
): Record<string, unknown> | undefined => {
  const defs = isRecord(document?.$defs) ? document.$defs : undefined;
  const definition = defs?.[name];
  return isRecord(definition) ? definition : undefined;
};

const scalarBranchName = (branch: Record<string, unknown>): string | undefined => {
  const { type, const: constant, enum: enumValues } = branch;
  if (typeof type === 'string') {
    return type;
  }
  if (
    typeof constant === 'string' ||
    typeof constant === 'number' ||
    typeof constant === 'boolean'
  ) {
    return String(constant);
  }
  return Array.isArray(enumValues) ? 'enum' : undefined;
};

const stripLocalPointer = (ref: string): string =>
  ref.startsWith(LOCAL_POINTER_PREFIX) ? ref.slice(LOCAL_POINTER_PREFIX.length) : ref;

const branchName = (branch: unknown): string | undefined => {
  if (!isRecord(branch)) {
    return undefined;
  }
  const { $ref: ref } = branch;
  if (typeof ref === 'string') {
    return parseDefinitionRef(ref)?.name ?? stripLocalPointer(ref);
  }
  return scalarBranchName(branch);
};

const childNamesOf = (definition: Record<string, unknown>): ChildNames | undefined => {
  const { properties, oneOf } = definition;

  if (isRecord(properties)) {
    const names = Object.keys(properties);
    return names.length > 0 ? { key: PROPERTY_NAMES_KEY, names } : undefined;
  }

  if (Array.isArray(oneOf)) {
    const names = oneOf.map(branchName).filter((name): name is string => name !== undefined);
    return names.length > 0 ? { key: UNION_BRANCH_NAMES_KEY, names } : undefined;
  }

  return undefined;
};

const takeNamesWithinBudget = (names: string[], budget: number): BudgetedNames => {
  const kept: string[] = [];
  // The enclosing brackets, matching how the list serializes.
  let cost = 2;

  for (const name of names) {
    // The name, its quotes, and the comma separating it from the previous entry.
    const nameCost = name.length + 3;
    if (cost + nameCost > budget) {
      break;
    }
    cost += nameCost;
    kept.push(name);
  }

  return { kept, cost: kept.length > 0 ? cost : 0, omitted: names.length - kept.length };
};

const describeAgainstClosure = ({
  closure,
  root,
  inlinedTotalChars,
  selfName,
}: DescribeOptions): DescribedSchema => {
  const definitions: Record<string, unknown> = {};
  const stubs = new Map<string, Record<string, unknown>>();
  let remainingChars = inlinedTotalChars;
  let remainingChildNameChars = MAX_STUB_CHILD_NAME_TOTAL_CHARS;

  const lookup = (parsed: DefinitionRef): Record<string, unknown> | undefined =>
    definitionIn(closure.get(parsed.file), parsed.name);

  const buildStub = (
    name: string,
    definition: Record<string, unknown>
  ): Record<string, unknown> => {
    const memoized = stubs.get(name);
    if (memoized) {
      return memoized;
    }

    const { description, type } = definition;
    const children = childNamesOf(definition);
    const { kept, cost, omitted } = children
      ? takeNamesWithinBudget(
          children.names,
          Math.min(MAX_STUB_CHILD_NAME_CHARS, remainingChildNameChars)
        )
      : { kept: [], cost: 0, omitted: 0 };
    remainingChildNameChars -= cost;

    const stub: Record<string, unknown> = {
      ...(type === undefined ? {} : { type }),
      title: name,
      ...(typeof description === 'string' ? { description } : {}),
      [EXPANDABLE_KEY]: name,
      ...(children ? { [children.key]: kept } : {}),
      ...(omitted > 0 ? { [OMITTED_NAMES_KEY]: omitted } : {}),
    };
    stubs.set(name, stub);
    return stub;
  };

  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(rewrite);
    }
    if (!isRecord(node)) {
      return node;
    }

    const siblings = mapValues(omit(node, ['$ref', ROUTING_LOCATION_KEY]), rewrite);

    const { $ref: ref } = node;
    if (typeof ref !== 'string') {
      return siblings;
    }

    const parsed = parseDefinitionRef(ref);
    const definition = parsed && lookup(parsed);
    if (!parsed || !definition) {
      return { ...siblings, $ref: ref };
    }

    if (parsed.name === selfName) {
      return { ...siblings, $ref: SELF_POINTER };
    }

    const localPointer = `${LOCAL_POINTER_PREFIX}${parsed.name}`;
    if (parsed.name in definitions) {
      return { ...siblings, $ref: localPointer };
    }

    const size = JSON.stringify(definition).length;
    if (size > MAX_INLINED_DEFINITION_CHARS || size > remainingChars) {
      return { ...buildStub(parsed.name, definition), ...siblings };
    }

    remainingChars -= size;

    // Reserve the slot before recursing so a definition that reaches itself resolves to the
    // pointer instead of recursing forever.
    definitions[parsed.name] = {};
    definitions[parsed.name] = rewrite(definition);
    return { ...siblings, $ref: localPointer };
  };

  const rewritten = rewrite(root);
  const described = isRecord(rewritten) ? rewritten : root;
  const expandableTypes = Array.from(stubs.keys()).sort();

  return {
    schema: Object.keys(definitions).length > 0 ? { ...described, $defs: definitions } : described,
    expandableTypes,
  };
};

const findDefinition = (
  closure: Map<string, Record<string, unknown>>,
  name: string
): Record<string, unknown> | undefined => {
  for (const document of closure.values()) {
    const definition = definitionIn(document, name);
    if (definition) {
      return definition;
    }
  }
  return undefined;
};

const buildDescribedSchema = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<DescribedSchema> => {
  const closure = await loadSchemaClosure(target, schema);
  return describeAgainstClosure({
    closure,
    root: schema,
    inlinedTotalChars: MAX_INLINED_TOTAL_CHARS,
  });
};

const buildDescribedDefinition = async (
  target: ApiTarget,
  schema: Record<string, unknown>,
  typeName: string
): Promise<DescribedSchema | undefined> => {
  const closure = await loadSchemaClosure(target, schema);
  const definition = findDefinition(closure, typeName);
  if (!definition) {
    return undefined;
  }

  // This definition is always emitted in full, so nested ones only get what it leaves behind.
  const inlinedTotalChars = Math.max(
    MAX_INLINED_TOTAL_CHARS - JSON.stringify(definition).length,
    MAX_INLINED_DEFINITION_CHARS
  );

  return describeAgainstClosure({
    closure,
    root: definition,
    inlinedTotalChars,
    selfName: typeName,
  });
};

const describedSchemaCache: Record<ApiTarget, Map<object, Promise<DescribedSchema>>> = {
  elasticsearch: new Map(),
  kibana: new Map(),
};

const describedDefinitionCache: Record<
  ApiTarget,
  Map<object, Map<string, Promise<DescribedSchema | undefined>>>
> = {
  elasticsearch: new Map(),
  kibana: new Map(),
};

/**
 * Turns an API's `input` schema into the self-contained document `describe_api` shows the model.
 *
 * Cross-file `$ref`s are resolved locally: definitions under
 * {@link MAX_INLINED_DEFINITION_CHARS} are inlined into a `$defs` block, and larger ones are
 * reduced to a stub naming the definition and its immediate children. Every stubbed definition
 * can be retrieved in full through {@link toDescribedDefinition}.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The API's `input` JSON Schema.
 * @returns The described schema and the names of the definitions it stubbed.
 * @throws {Error} when a referenced file cannot be loaded.
 */
export const toDescribedSchema = async (
  target: ApiTarget,
  schema: Record<string, unknown>
): Promise<DescribedSchema> => {
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

/**
 * Describes a single definition an API's schema reaches, which is how a stub left by
 * {@link toDescribedSchema} is expanded.
 *
 * @param target - Backend the API belongs to.
 * @param schema - The API's `input` JSON Schema, whose closure the definition is looked up in.
 * @param typeName - Bare definition name, as carried by a stub's `x-expandable`.
 * @returns The described definition, or undefined when the schema's closure holds no definition
 * under that name.
 * @throws {Error} when a referenced file cannot be loaded.
 */
export const toDescribedDefinition = async (
  target: ApiTarget,
  schema: Record<string, unknown>,
  typeName: string
): Promise<DescribedSchema | undefined> => {
  const cache = describedDefinitionCache[target];

  let byName = cache.get(schema);
  if (!byName) {
    byName = new Map();
    cache.set(schema, byName);
  }

  let pending = byName.get(typeName);
  if (!pending) {
    pending = buildDescribedDefinition(target, schema, typeName)
      .then((described) => {
        if (!described) {
          byName?.delete(typeName);
        }
        return described;
      })
      .catch((error) => {
        byName?.delete(typeName);
        throw error;
      });
    byName.set(typeName, pending);
  }

  return pending;
};
