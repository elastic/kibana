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

/** The KI type of a wiki page, an overview that ties related knowledge items together. */
export const WIKI_PAGE_KI_TYPE = 'wiki.page';
/** When enrichment last looked for more information to add to a KI. */
export const ENRICHED_AT_ATTRIBUTE = 'memory.enriched_at';
/** How many knowledge items a wiki page ties together. */
export const WIKI_MEMBER_COUNT_ATTRIBUTE = 'wiki.member_count';
/** The `relates_to` description of a wiki page's reference to one of its members. */
export const WIKI_MEMBER_REFERENCE_DESCRIPTION = 'member';

/**
 * A KI type filter of enrichment and wiki: an exact type such as `entity.customer`, or every type
 * under a prefix such as `fact.*`.
 */
export const DREAMING_KI_TYPE_FILTER_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)*(\.\*)?$/;
export const MAX_DREAMING_KI_TYPE_FILTERS = 20;
/** The KI types enrichment improves, and wiki pages are built from, when none are configured. */
export const DEFAULT_DREAMING_KI_TYPE_FILTERS: readonly string[] = ['fact.*', 'entity.*'];
/** KI types neither enrichment nor wiki pages read, whatever the filters say. */
export const DREAMING_EXCLUDED_KI_TYPES: readonly string[] = [RELATIONSHIP_KI_TYPE];

export const DEFAULT_ENRICHMENT_MAX_DOCUMENTS = 10;
export const MAX_ENRICHMENT_MAX_DOCUMENTS = 50;
export const DEFAULT_ENRICHMENT_REFRESH_AFTER = '30d';
export const DEFAULT_WIKI_MAX_PAGES = 5;
export const MAX_WIKI_MAX_PAGES = 25;

/**
 * Pulls more information into existing knowledge items from the AI index's sources: its ES|QL
 * sources' indices and its connectors.
 */
export interface DreamingEnrichmentConfig {
  /** Whether enrichment runs on the dreaming schedule. */
  enabled: boolean;
  /** Which knowledge items are worth improving, as the selecting model reads it. */
  selection?: string;
  /** What to improve them in: what to look for in the sources, and what to add. */
  improvement?: string;
  /** The KI types to improve. Missing or empty: {@link DEFAULT_DREAMING_KI_TYPE_FILTERS}. */
  ki_types?: string[];
  /** At most how many knowledge items one run improves. */
  max_documents?: number;
  /** How long an improved KI that has not changed is left alone, such as `30d`. */
  refresh_after?: string;
}

/**
 * Builds wiki-style overview pages that tie related knowledge items together, adding what the AI
 * index's sources say about their topic.
 */
export interface DreamingWikiConfig {
  /** Whether wiki pages are built on the dreaming schedule. */
  enabled: boolean;
  /** Which pages to build and how to write them, as the model reads it. */
  instructions?: string;
  /** The KI types pages are built from. Missing or empty: {@link DEFAULT_DREAMING_KI_TYPE_FILTERS}. */
  ki_types?: string[];
  /** At most how many pages one run creates or updates. */
  max_pages?: number;
  /** Whether pages also draw on the AI index's sources. Defaults to `true`. */
  research?: boolean;
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
  /** Improving existing knowledge items from the sources. Missing: off. */
  enrichment?: DreamingEnrichmentConfig | null;
  /** Building wiki pages from the knowledge items. Missing: off. */
  wiki?: DreamingWikiConfig | null;
}

/** The parts of a dreaming config that say what it builds. */
export type DreamingTypesConfig = Pick<
  AiIndexDreamingConfig,
  'facts' | 'entities' | 'relationships'
>;

/** Response of `GET` and `PUT /internal/context_engine/ai_index/{aiIndexId}/dreaming`. */
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
}: DreamingTypesConfig): DreamingTypes => {
  const nodes = entities?.nodes ?? [];
  return {
    facts: facts ?? [],
    entities: nodes,
    relationships: nodes.length > 0 ? relationships ?? [] : [],
  };
};

/**
 * Whether an AI index's dreaming config is set up, on or off. `enabled` only decides whether
 * dreaming runs on its schedule.
 */
export const isDreamingConfigured = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming !== undefined &&
  (dreaming.enabled ||
    dreamingBuildsAnything(dreaming) ||
    dreaming.enrichment?.enabled === true ||
    dreaming.wiki?.enabled === true);

/** Whether dreaming runs on memories and traces: it is on and builds facts or entities. */
export const dreamsOnMemories = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** Whether dreaming improves existing knowledge items from the sources. */
export const dreamsEnrichment = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming?.enabled === true && dreaming.enrichment?.enabled === true;

/** Whether dreaming builds wiki pages. */
export const dreamsWiki = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming?.enabled === true && dreaming.wiki?.enabled === true;

/** Whether dreaming runs any of its workflows. */
export const dreamsAtAll = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreamsOnMemories(dreaming) || dreamsEnrichment(dreaming) || dreamsWiki(dreaming);

/** The KI type filters of enrichment or wiki pages, with the defaults when none are set. */
export const kiTypeFiltersOf = (
  config: Pick<DreamingEnrichmentConfig, 'ki_types'> | null | undefined
): string[] =>
  config?.ki_types && config.ki_types.length > 0
    ? config.ki_types
    : [...DEFAULT_DREAMING_KI_TYPE_FILTERS];

/** Whether a KI type passes a list of KI type filters. */
export const matchesKiTypeFilters = (type: string, filters: readonly string[]): boolean =>
  !DREAMING_EXCLUDED_KI_TYPES.includes(type) &&
  filters.some((filter) =>
    filter.endsWith('.*') ? type.startsWith(filter.slice(0, -1)) : type === filter
  );

const DREAMING_AUTOMATION_WORKFLOW_ID_PREFIXES: readonly string[] = [
  'system-context-engine-dreaming-',
  'system-context-engine-trace-dreaming-',
  'system-context-engine-relationships-',
  'system-context-engine-enrichment-',
  'system-context-engine-wiki-',
];

/** Whether an automation is one of the workflows dreaming attaches to an AI index. */
export const isDreamingAutomation = ({ type, value }: { type: string; value: string }): boolean =>
  type === 'workflow' &&
  DREAMING_AUTOMATION_WORKFLOW_ID_PREFIXES.some((prefix) => value.startsWith(prefix));

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

/**
 * What is wrong with a whole dreaming config beyond the shape of its fields, or `undefined`: the
 * checks of {@link validateDreamingTypes}, and a KI type filter of enrichment or wiki listed twice.
 */
export const validateDreamingConfig = (
  config: Pick<
    AiIndexDreamingConfig,
    'facts' | 'entities' | 'relationships' | 'enrichment' | 'wiki'
  >
): string | undefined => {
  const typesError = validateDreamingTypes(config);
  if (typesError !== undefined) {
    return typesError;
  }
  for (const [kind, block] of [
    ['Enrichment', config.enrichment],
    ['Wiki', config.wiki],
  ] as const) {
    const duplicate = findDuplicate(block?.ki_types ?? []);
    if (duplicate !== undefined) {
      return `${kind} lists KI type '${duplicate}' twice.`;
    }
  }
  return undefined;
};
