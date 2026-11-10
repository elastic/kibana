/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What fact, entity and attribute names may be made of. */
export const DREAMING_TYPE_PATTERN = /^[a-z0-9_]+$/;

export const DEFAULT_DREAMING_INTERVAL = '24h';
export const MIN_DREAMING_INTERVAL_MINUTES = 15;

export const MAX_DREAMING_INTERVAL_LENGTH = 16;
export const MAX_DREAMING_INSTRUCTIONS_LENGTH = 8192;
export const MAX_DREAMING_TYPE_LENGTH = 128;
export const MAX_DREAMING_TYPE_DESCRIPTION_LENGTH = 2048;
export const MAX_DREAMING_FACT_TYPES = 50;
export const MAX_DREAMING_ENTITY_TYPES = 50;
export const MAX_DREAMING_ENTITY_ATTRIBUTES = 50;
export const MAX_DREAMING_RELATIONSHIP_TYPES = 50;
export const MAX_DREAMING_CONNECTOR_ID_LENGTH = 256;

/** Type prefixes of the KIs dreaming writes: `fact.<fact type>` and `entity.<entity type>`. */
export const FACT_TYPE_PREFIX = 'fact.';
export const ENTITY_TYPE_PREFIX = 'entity.';

export const isDreamedKiType = (type: string): boolean =>
  type.startsWith(FACT_TYPE_PREFIX) || type.startsWith(ENTITY_TYPE_PREFIX);

/** The KI types of the memories dreaming reads. */
export const DREAMING_MEMORY_KI_TYPES: readonly string[] = [
  'memory.session_fact',
  'memory.session',
];

/** The KI type of a relationship between two facts or entities. */
export const RELATIONSHIP_KI_TYPE = 'memory.relationship';
/** The relationship type of a relationship KI, such as `member_of`. */
export const RELATIONSHIP_RELATION_ATTRIBUTE = 'relationship.relation';
/** `<from id>|<relationship type>|<to id>`, so queries can filter on either end. */
export const RELATIONSHIP_KEY_ATTRIBUTE = 'memory.key';
/** The built-in relationship type from a fact to an entity it is about. Configured types link two entities. */
export const ABOUT_RELATIONSHIP_TYPE = 'about';

/** How many memories a fact or entity was seen in. */
export const OCCURRENCES_ATTRIBUTE = 'memory.number_of_occurrences';
/** When the latest memory a fact or entity was seen in was recorded. */
export const LAST_SEEN_AT_ATTRIBUTE = 'memory.last_seen_at';

/** Maximum items in each list of a change set. */
export const MAX_DREAMING_CHANGE_SET_ITEMS = 200;
/** Maximum memories one dreaming step takes. */
export const MAX_DREAMING_STEP_MEMORIES = 200;

/** Maximum access patterns on one entity or fact, and the bounds on their fields. */
export const MAX_DREAMING_ACCESS_PATTERNS = 5;
export const MAX_ACCESS_PATTERN_LABEL_LENGTH = 256;
export const MAX_ACCESS_PATTERN_RETURNS_LENGTH = 1024;
export const MAX_ACCESS_PATTERN_ESQL_LENGTH = 4096;

/**
 * Attribute keys dreaming writes on every entity for itself, so an entity type can't configure
 * them: the access pattern queries the ES|QL verifiers check, and the patterns as JSON.
 */
export const RESERVED_ENTITY_ATTRIBUTE_KEYS: readonly string[] = ['esql', 'access_patterns'];

export interface DreamingFactType {
  type: string;
  description?: string;
}

export interface DreamingEntityType {
  type: string;
  description?: string;
  /** Attribute keys, stored on the entity as they are, such as `tier`. */
  attributes?: string[];
}

/** Entity types. Entities are built only when `nodes` names at least one type. */
export interface DreamingEntities {
  nodes: DreamingEntityType[];
}

export interface DreamingRelationshipType {
  type: string;
  description?: string;
}

/**
 * What an AI index learns from its memories: facts, entities, and the relationships between them.
 * A kind with no types configured is not built.
 */
export interface AiIndexDreamingConfig {
  /** Whether dreaming runs on its schedule. */
  enabled: boolean;
  /** How often dreaming runs. Defaults to {@link DEFAULT_DREAMING_INTERVAL}. */
  schedule?: { interval: string };
  /** What dreaming is told about the AI index: what it holds, and what to record or skip. */
  instructions?: string;
  /** The AI connector dreaming prompts. Missing: Context Engine's default model. */
  connector_id?: string;
  /** Fact types to build. Missing or empty: no facts. */
  facts?: DreamingFactType[] | null;
  /** Entity types. Missing: no entities. */
  entities?: DreamingEntities | null;
  /**
   * Relationship types linking two entities. Missing or empty: no relationships. When set, facts
   * also link to the entities they are about, with the built-in `about` type.
   */
  relationships?: DreamingRelationshipType[] | null;
}

/** The parts of a dreaming config that say what it builds. */
export type DreamingTypesConfig = Pick<
  AiIndexDreamingConfig,
  'facts' | 'entities' | 'relationships'
>;

/** Response of `GET` and `PUT /api/context_engine/ai_index/{aiIndexId}/_dreaming`. */
export interface GetAiIndexDreamingResponse {
  dreaming: AiIndexDreamingConfig;
}

/** The dreaming config of an AI index that never configured it. */
export const DREAMING_DISABLED: AiIndexDreamingConfig = { enabled: false };

/** The fact, entity and relationship types a config builds. */
export interface DreamingTypes {
  facts: DreamingFactType[];
  entities: DreamingEntityType[];
  relationships: DreamingRelationshipType[];
}

export const dreamingTypesOf = ({
  facts,
  entities,
  relationships,
}: DreamingTypesConfig): DreamingTypes => ({
  facts: facts ?? [],
  entities: entities?.nodes ?? [],
  relationships: relationships ?? [],
});

/**
 * Whether an AI index takes memories: its dreaming config is set up, on or off. `enabled` only
 * decides whether dreaming runs on its schedule.
 */
export const isDreamingConfigured = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming !== undefined && (dreaming.enabled || dreamingBuildsAnything(dreaming));

/** Whether a config builds anything at all: at least one fact or entity type. */
export const dreamingBuildsAnything = (config: DreamingTypesConfig): boolean => {
  const { facts, entities } = dreamingTypesOf(config);
  return facts.length > 0 || entities.length > 0;
};

const findDuplicate = (values: readonly string[]): string | undefined =>
  values.find((value, position) => values.indexOf(value) !== position);

/**
 * What is wrong with a config beyond the shape of its fields, or `undefined` when nothing is: a
 * type named twice, or an attribute listed twice.
 */
export const validateDreamingTypes = ({
  facts,
  entities,
  relationships,
}: DreamingTypesConfig): string | undefined => {
  const duplicateFact = findDuplicate((facts ?? []).map(({ type }) => type));
  if (duplicateFact !== undefined) {
    return `Fact type '${duplicateFact}' is listed twice.`;
  }
  const nodes = entities?.nodes ?? [];
  const duplicateEntity = findDuplicate(nodes.map(({ type }) => type));
  if (duplicateEntity !== undefined) {
    return `Entity type '${duplicateEntity}' is listed twice.`;
  }
  for (const { type, attributes } of nodes) {
    const duplicateAttribute = findDuplicate(attributes ?? []);
    if (duplicateAttribute !== undefined) {
      return `Entity type '${type}' lists attribute '${duplicateAttribute}' twice.`;
    }
  }
  const relationshipTypes = (relationships ?? []).map(({ type }) => type);
  if (relationshipTypes.includes(ABOUT_RELATIONSHIP_TYPE)) {
    return `Relationship type '${ABOUT_RELATIONSHIP_TYPE}' is built in.`;
  }
  const duplicateRelationship = findDuplicate(relationshipTypes);
  if (duplicateRelationship !== undefined) {
    return `Relationship type '${duplicateRelationship}' is listed twice.`;
  }
  return undefined;
};
