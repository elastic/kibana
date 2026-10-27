/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/** Kind and attribute names: they become KI types, KI id segments and attribute keys. */
export const EXTRACTION_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
export const MAX_EXTRACTION_KINDS = 30;
export const MAX_EXTRACTION_ATTRIBUTES = 20;
export const MAX_EXTRACTION_DESCRIPTION_LENGTH = 1000;
export const MAX_EXTRACTION_INSTRUCTIONS_LENGTH = 4000;

const MAX_ENUM_VALUES = 50;
const MAX_ENUM_VALUE_LENGTH = 256;

const nameSchema = z.string().regex(EXTRACTION_NAME_PATTERN);
const descriptionSchema = z.string().min(1).max(MAX_EXTRACTION_DESCRIPTION_LENGTH);
const instructionsSchema = z.string().max(MAX_EXTRACTION_INSTRUCTIONS_LENGTH);

const nodeKindSchema = z.object({
  type: nameSchema,
  description: descriptionSchema,
  attributes: z
    .record(nameSchema, descriptionSchema)
    .refine((attributes) => Object.keys(attributes).length <= MAX_EXTRACTION_ATTRIBUTES, {
      message: `at most ${MAX_EXTRACTION_ATTRIBUTES} attributes`,
    })
    .optional(),
});

/** Input bounds for the `memory_extraction` configuration; `compileMemoryExtractionConfig` checks the rest. */
export const memoryExtractionConfigSchema = z.object({
  instructions: instructionsSchema.optional(),
  facts: z.array(nodeKindSchema).max(MAX_EXTRACTION_KINDS).optional(),
  entities: z.array(nodeKindSchema).max(MAX_EXTRACTION_KINDS).optional(),
  relationships: z
    .array(
      z.object({
        type: nameSchema,
        description: descriptionSchema,
        source: nameSchema,
        target: nameSchema,
      })
    )
    .max(MAX_EXTRACTION_KINDS)
    .optional(),
});

const attributeSchemaSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('string'),
    description: descriptionSchema.optional(),
    enum: z.array(z.string().min(1).max(MAX_ENUM_VALUE_LENGTH)).max(MAX_ENUM_VALUES).optional(),
  }),
  z.object({ type: z.literal('number'), description: descriptionSchema.optional() }),
  z.object({ type: z.literal('boolean'), description: descriptionSchema.optional() }),
  z.object({
    type: z.literal('array'),
    description: descriptionSchema.optional(),
    items: z.object({ type: z.literal('string') }),
  }),
]);

/** Input bounds for the `memory_custom_extraction` configuration. */
export const memoryCustomExtractionConfigSchema = z.object({
  instructions: instructionsSchema.min(1),
  types: z
    .array(
      z.object({
        type: nameSchema,
        description: descriptionSchema,
        attributes: z
          .record(nameSchema, attributeSchemaSchema)
          .refine((attributes) => Object.keys(attributes).length <= MAX_EXTRACTION_ATTRIBUTES, {
            message: `at most ${MAX_EXTRACTION_ATTRIBUTES} attributes`,
          })
          .optional(),
      })
    )
    .min(1)
    .max(MAX_EXTRACTION_KINDS),
});

export const MAX_EXTRACTION_SOURCES = 5;
const MAX_SOURCE_QUERY_LENGTH = 10_000;
const MAX_SOURCE_RECORDS = 1000;
const DEFAULT_SOURCE_RECORDS = 200;
const MAX_LOOKBACK_HOURS = 24 * 30;
const ID_COLUMN_PATTERN = /^[A-Za-z_@][A-Za-z0-9_.@]{0,127}$/;
const URI_PREFIX_PATTERN = /^[a-z][a-z0-9+.-]{0,31}:\/\/$/;

/** Where an extraction run reads its records from. */
export type ExtractionSource =
  | { type: 'short_term_memory' }
  | {
      type: 'query';
      /** ES|QL run as the workflow owner through the AI index query step. */
      query: string;
      /** What the rows are, for the model, such as "support tickets". */
      description?: string;
      /** Only rows whose `@timestamp` falls in the last this many hours. */
      lookbackHours?: number;
      /** The column identifying a row. Defaults by target: `trace_id` for traces, else `id`. */
      idColumn?: string;
      /** Turns an id into a provenance reference. Defaults by target: `ki://`, `trace://` or `record://`. */
      uriPrefix?: string;
      /** Leave out `memory.*` KIs. Defaults to true when the query reads an AI index. */
      excludeMemory?: boolean;
      maxRecords?: number;
    };

const extractionSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('short_term_memory') }),
  z.object({
    type: z.literal('query'),
    query: z.string().min(1).max(MAX_SOURCE_QUERY_LENGTH),
    description: descriptionSchema.optional(),
    lookbackHours: z.number().int().min(1).max(MAX_LOOKBACK_HOURS).optional(),
    idColumn: z.string().regex(ID_COLUMN_PATTERN).optional(),
    uriPrefix: z.string().regex(URI_PREFIX_PATTERN).optional(),
    excludeMemory: z.boolean().optional(),
    maxRecords: z.number().int().min(1).max(MAX_SOURCE_RECORDS).optional(),
  }),
]);

/** Input bounds for the sources both extraction templates accept. */
export const extractionSourcesSchema = z
  .array(extractionSourceSchema)
  .min(1)
  .max(MAX_EXTRACTION_SOURCES);

/** A source as the template reads it from `consts.sources`. */
interface NormalizedSource {
  type: ExtractionSource['type'];
  description: string;
  id_column: string;
  uri_prefix: string;
  query?: string;
  max_records?: number;
}

const readsAiIndex = (query: string): boolean => /\bFROM\s+[^|]*\.?ai-index-/i.test(query);
const readsTraces = (query: string): boolean => /\bFROM\s+[^|]*traces-/i.test(query);

/**
 * Builds each source's final ES|QL: the memory exclusion and the time window are appended here,
 * once, rather than in Liquid on every run.
 */
export const normalizeExtractionSources = (sources: ExtractionSource[]): NormalizedSource[] => {
  if (sources.length === 0 || sources.length > MAX_EXTRACTION_SOURCES) {
    throw new Error(`Extraction needs 1 to ${MAX_EXTRACTION_SOURCES} sources.`);
  }
  if (sources.filter(({ type }) => type === 'short_term_memory').length > 1) {
    throw new Error('Short-term memory can be a source only once.');
  }
  return sources.map((source) => {
    if (source.type === 'short_term_memory') {
      return {
        type: 'short_term_memory',
        description: 'short-term memories users recorded with the agents, each with an `id`',
        id_column: 'id',
        uri_prefix: 'stm://',
      };
    }
    const { query } = source;
    // The query is spliced into the workflow and rendered by Liquid; a tag in it would run.
    if (query.includes('{{') || query.includes('{%')) {
      throw new Error('A source query cannot contain Liquid tags ({{ or {%).');
    }
    const aiIndex = readsAiIndex(query);
    const traces = !aiIndex && readsTraces(query);
    const excludeMemory = source.excludeMemory ?? aiIndex;
    return {
      type: 'query',
      description:
        source.description ??
        (aiIndex ? 'knowledge indicators' : traces ? 'agent traces' : 'query results'),
      id_column: source.idColumn ?? (traces ? 'trace_id' : 'id'),
      uri_prefix: source.uriPrefix ?? (aiIndex ? 'ki://' : traces ? 'trace://' : 'record://'),
      query: [
        query.trim(),
        ...(excludeMemory ? ['| WHERE type IS NULL OR type NOT LIKE "memory.*"'] : []),
        ...(source.lookbackHours !== undefined
          ? [`| WHERE @timestamp >= NOW() - ${source.lookbackHours} hours`]
          : []),
      ].join('\n'),
      max_records: source.maxRecords ?? DEFAULT_SOURCE_RECORDS,
    };
  });
};

/** Custom kinds are written as `memory.<kind>`, so they must not shadow the built-in categories. */
const RESERVED_CUSTOM_KINDS = new Set([
  'fact',
  'entity',
  'relationship',
  'session',
  'session_fact',
]);

export interface ExtractionNodeKind {
  type: string;
  description: string;
  /** Attribute name to its meaning. Values are extracted as text. */
  attributes?: Record<string, string>;
}

export interface ExtractionRelationshipKind {
  type: string;
  description: string;
  /** The kind of the node the relationship starts at. */
  source: string;
  /** The kind of the node the relationship points at. */
  target: string;
}

/** Facts, entities and relationships, as in `memory_extraction`. */
export interface MemoryExtractionConfig {
  instructions?: string;
  facts?: ExtractionNodeKind[];
  entities?: ExtractionNodeKind[];
  relationships?: ExtractionRelationshipKind[];
}

/** The JSON Schema shapes a custom attribute may take; KI attributes hold only these. */
export type ExtractionAttributeSchema =
  | { type: 'string'; description?: string; enum?: string[] }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; description?: string; items: { type: 'string' } };

export interface ExtractionCustomKind {
  type: string;
  description: string;
  /** Attribute name to its JSON Schema. */
  attributes?: Record<string, ExtractionAttributeSchema>;
}

/** Free-form kinds with typed attributes, as in `memory_custom_extraction`. */
export interface MemoryCustomExtractionConfig {
  instructions: string;
  types: ExtractionCustomKind[];
}

interface NodeKind {
  ki_type: string;
  id_prefix: string;
}

interface CompiledExtraction {
  nodeKinds: Record<string, NodeKind>;
  relationshipKinds: Record<string, { source: string; target: string }>;
  attributes: Record<string, ExtractionAttributeSchema>;
  relationshipTypes: string[];
}

const assertName = (label: string, name: string): void => {
  if (!EXTRACTION_NAME_PATTERN.test(name)) {
    throw new Error(
      `${label} "${name}" must start with a lowercase letter and use only lowercase letters, numbers and underscores (at most 64).`
    );
  }
};

const assertDescription = (label: string, description: string): void => {
  if (description.trim() === '' || description.length > MAX_EXTRACTION_DESCRIPTION_LENGTH) {
    throw new Error(
      `${label} needs a description of 1 to ${MAX_EXTRACTION_DESCRIPTION_LENGTH} characters.`
    );
  }
};

const assertInstructions = (instructions: string | undefined): void => {
  if (instructions !== undefined && instructions.length > MAX_EXTRACTION_INSTRUCTIONS_LENGTH) {
    throw new Error(
      `instructions must be at most ${MAX_EXTRACTION_INSTRUCTIONS_LENGTH} characters.`
    );
  }
};

/**
 * Collects attributes from every kind into one schema. A name shared by several kinds must mean
 * the same JSON type in all of them, since the model fills one `attributes` object per node.
 */
const mergeAttributes = (
  kinds: Array<{ type: string; attributes: Record<string, ExtractionAttributeSchema> }>
): Record<string, ExtractionAttributeSchema> => {
  const merged: Record<string, ExtractionAttributeSchema> = {};
  for (const { type, attributes } of kinds) {
    const names = Object.keys(attributes);
    if (names.length > MAX_EXTRACTION_ATTRIBUTES) {
      throw new Error(`"${type}" has more than ${MAX_EXTRACTION_ATTRIBUTES} attributes.`);
    }
    for (const name of names) {
      assertName(`Attribute of "${type}"`, name);
      const schema = attributes[name];
      const description = `${type}: ${schema.description ?? name}`;
      const existing = merged[name];
      if (existing === undefined) {
        merged[name] = { ...schema, description };
        continue;
      }
      if (existing.type !== schema.type) {
        throw new Error(
          `Attribute "${name}" is a ${existing.type} for one kind and a ${schema.type} for "${type}"; use one type or two names.`
        );
      }
      merged[name] = { ...existing, description: `${existing.description}; ${description}` };
    }
  }
  return merged;
};

const assertUniqueKinds = (types: string[]): void => {
  const seen = new Set<string>();
  for (const type of types) {
    if (seen.has(type)) {
      throw new Error(`Kind "${type}" is defined twice.`);
    }
    seen.add(type);
  }
};

export const compileMemoryExtractionConfig = (
  config: MemoryExtractionConfig
): CompiledExtraction => {
  assertInstructions(config.instructions);
  const facts = config.facts ?? [];
  const entities = config.entities ?? [];
  const relationships = config.relationships ?? [];
  const nodes = [...facts, ...entities];
  if (nodes.length === 0) {
    throw new Error('The extraction configuration needs at least one fact or entity kind.');
  }
  if (nodes.length > MAX_EXTRACTION_KINDS || relationships.length > MAX_EXTRACTION_KINDS) {
    throw new Error(
      `At most ${MAX_EXTRACTION_KINDS} node kinds and ${MAX_EXTRACTION_KINDS} relationship kinds.`
    );
  }
  for (const { type, description } of nodes) {
    assertName('Kind', type);
    assertDescription(`"${type}"`, description);
  }
  assertUniqueKinds(nodes.map(({ type }) => type));

  const nodeKinds: Record<string, NodeKind> = {};
  for (const { type } of facts) {
    nodeKinds[type] = { ki_type: `memory.fact.${type}`, id_prefix: `memory/fact/${type}/` };
  }
  for (const { type } of entities) {
    nodeKinds[type] = { ki_type: `memory.entity.${type}`, id_prefix: `memory/entity/${type}/` };
  }

  const relationshipKinds: Record<string, { source: string; target: string }> = {};
  for (const { type, description, source, target } of relationships) {
    assertName('Relationship', type);
    assertDescription(`Relationship "${type}"`, description);
    if (relationshipKinds[type]) {
      throw new Error(`Relationship "${type}" is defined twice.`);
    }
    for (const end of [source, target]) {
      if (!nodeKinds[end]) {
        throw new Error(
          `Relationship "${type}" refers to "${end}", which is not a configured fact or entity kind.`
        );
      }
    }
    relationshipKinds[type] = { source, target };
  }

  const attributes = mergeAttributes(
    nodes.map(({ type, attributes: textAttributes = {} }) => ({
      type,
      attributes: Object.fromEntries(
        Object.entries(textAttributes).map(([name, description]) => {
          assertDescription(`Attribute "${name}" of "${type}"`, description);
          return [name, { type: 'string', description } satisfies ExtractionAttributeSchema];
        })
      ),
    }))
  );

  return {
    nodeKinds,
    relationshipKinds,
    attributes,
    relationshipTypes: Object.keys(relationshipKinds),
  };
};

const ATTRIBUTE_SCHEMA_TYPES = new Set(['string', 'number', 'boolean', 'array']);

const assertAttributeSchema = (type: string, name: string, schema: ExtractionAttributeSchema) => {
  if (!ATTRIBUTE_SCHEMA_TYPES.has(schema.type)) {
    throw new Error(
      `Attribute "${name}" of "${type}" must be a string, number, boolean or array of strings.`
    );
  }
  if (schema.type === 'array' && schema.items?.type !== 'string') {
    throw new Error(`Attribute "${name}" of "${type}" must be an array of strings.`);
  }
  if (schema.description !== undefined) {
    assertDescription(`Attribute "${name}" of "${type}"`, schema.description);
  }
};

export const compileMemoryCustomExtractionConfig = (
  config: MemoryCustomExtractionConfig
): CompiledExtraction => {
  assertInstructions(config.instructions);
  if (config.instructions.trim() === '') {
    throw new Error('Custom extraction needs instructions saying what to extract.');
  }
  if (config.types.length === 0 || config.types.length > MAX_EXTRACTION_KINDS) {
    throw new Error(`Custom extraction needs 1 to ${MAX_EXTRACTION_KINDS} types.`);
  }
  for (const { type, description, attributes = {} } of config.types) {
    assertName('Type', type);
    if (RESERVED_CUSTOM_KINDS.has(type)) {
      throw new Error(`Type "${type}" is reserved; choose another name.`);
    }
    assertDescription(`"${type}"`, description);
    for (const [name, schema] of Object.entries(attributes)) {
      assertAttributeSchema(type, name, schema);
    }
  }
  assertUniqueKinds(config.types.map(({ type }) => type));

  return {
    nodeKinds: Object.fromEntries(
      config.types.map(({ type }) => [
        type,
        { ki_type: `memory.${type}`, id_prefix: `memory/${type}/` },
      ])
    ),
    relationshipKinds: {},
    attributes: mergeAttributes(
      config.types.map(({ type, attributes = {} }) => ({ type, attributes }))
    ),
    relationshipTypes: [],
  };
};

const nodeReference = (kinds: string[]) => ({
  type: 'object',
  properties: { type: { type: 'string', enum: kinds }, key: { type: 'string' } },
  required: ['type', 'key'],
});

/** The `extract` step's output schema: node and relationship kinds as enums, attributes as properties. */
export const buildExtractionOutputSchema = ({
  nodeKinds,
  attributes,
  relationshipTypes,
}: CompiledExtraction): Record<string, unknown> => {
  const kinds = Object.keys(nodeKinds);
  const stringList = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object',
    properties: {
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: kinds },
            key: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            content: { type: 'string' },
            attributes: { type: 'object', properties: attributes },
            mentions: { type: 'array', items: nodeReference(kinds) },
            source_ids: stringList,
          },
          required: ['type', 'key', 'title', 'description', 'content', 'source_ids'],
        },
      },
      ...(relationshipTypes.length > 0 && {
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: relationshipTypes },
              source: nodeReference(kinds),
              target: nodeReference(kinds),
              description: { type: 'string' },
              source_ids: stringList,
            },
            required: ['type', 'source', 'target', 'description', 'source_ids'],
          },
        },
      }),
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            decision: { type: 'string', enum: ['extracted', 'rejected', 'wait'] },
            reason: { type: 'string' },
          },
          required: ['id', 'decision', 'reason'],
        },
      },
    },
    required: ['nodes', 'decisions'],
  };
};

/**
 * The tokens of the memory extraction template that depend on the configuration. JSON is valid
 * YAML flow syntax, so every structured value renders on its key's own line.
 */
export const buildMemoryExtractionTokens = (
  config: MemoryExtractionConfig | MemoryCustomExtractionConfig,
  compiled: CompiledExtraction,
  sources: ExtractionSource[]
): Record<string, string> => ({
  __SOURCES__: JSON.stringify(normalizeExtractionSources(sources)),
  __EXTRACTION_CONFIG__: JSON.stringify(config),
  __NODE_KINDS__: JSON.stringify(compiled.nodeKinds),
  __RELATIONSHIP_KINDS__: JSON.stringify(compiled.relationshipKinds),
  __OUTPUT_SCHEMA__: JSON.stringify(buildExtractionOutputSchema(compiled)),
});
