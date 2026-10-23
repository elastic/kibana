/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { EventTypeOpts } from '@kbn/core/server';
import type { RiskScoreDistribution } from '../../common';
import type { EntityMaintainerTelemetryEventType } from '../tasks/entity_maintainers/types';

// ------------------------------------
//  Event types
// ------------------------------------

interface InitializationEvent {
  entityType: string;
  namespace: string;
}

interface InitializationFailureEvent {
  error: string;
  namespace: string;
}

interface DeletionEvent {
  entityType: string;
  namespace: string;
}

interface StoreUsageEventPayload {
  storeSize: number;
  entityType: string;
  namespace: string;
  sources?: Record<string, number>;
  baseScoreDistribution?: RiskScoreDistribution;
  resolutionScoreDistribution?: RiskScoreDistribution;
}

interface MetadataUsageEventPayload {
  namespace: string;
  docCount: number;
}

interface EntityStoreHealthComponentPayload {
  id: string;
  resource: string;
  installed: boolean;
  status?: string;
  lastError?: string;
}

interface EntityStoreHealthEnginePayload {
  type: string;
  status: string;
  components: EntityStoreHealthComponentPayload[];
}

interface EntityStoreHealthReportPayload {
  namespace: string;
  engines: EntityStoreHealthEnginePayload[];
}

interface EntityMaintainerEvent {
  id: string;
  namespace?: string;
  type: EntityMaintainerTelemetryEventType;
  errorMessage?: string;
}

interface ResolutionEventBase {
  namespace: string;
}

interface ResolutionTypedEvent extends ResolutionEventBase {
  entityType: string;
}

interface ResolutionLinkEvent extends ResolutionTypedEvent {
  entitiesLinked: number;
  entitiesSkipped: number;
}

interface ResolutionUnlinkEvent extends ResolutionTypedEvent {
  entitiesUnlinked: number;
  entitiesSkipped: number;
}

interface ResolutionGroupViewEvent extends ResolutionTypedEvent {
  groupSize: number;
}

interface ResolutionErrorEvent extends ResolutionEventBase {
  errorType: string;
  operation: string;
}

interface ResolutionRuleStatePayload {
  id: string;
  enabled: boolean;
  defaultEnabled: boolean;
}

interface ResolutionRulesStateEvent {
  namespace: string;
  rules: ResolutionRuleStatePayload[];
}

export interface EntitySourceStateEventPayload {
  namespace: string;
  entityType: string;
  source: string;
  sourceKind: 'integration' | 'custom';
  entities: number;
  resolved: number;
  targets?: number;
  standalone?: number;
  withRiskScore: number;
  onWatchlist: { managed: number; custom: number };
  byPrimaryIdentifier?: Array<{ identifier: string; entities: number }>;
}

export type CollectionOutcomePayload = 'complete' | 'timed_out' | 'failed' | 'skipped';

export interface EntityMetadataEventPayload {
  namespace: string;
  entityType: string;
  totalEntities: number;
  origin: {
    withMultipleSources: number;
    withoutSource: number;
    byCreator: Array<{ creator: string; entities: number }>;
    byIdentityProvider?: Array<{ provider: string; entities: number }>;
  };
  identifiers?: { byPrimaryIdentifier: Array<{ identifier: string; entities: number }> };
  unlinkedDuplicates: {
    sameIdDifferentCase?: { groups: number; entities: number; largestGroup: number };
    sameValueAcrossSources?: Array<{
      sourceA: string;
      sourceB: string;
      field: string;
      sharedValues: number;
      alreadyLinked: number;
    }>;
  };
  resolution: { groupSizes: Array<{ size: number; groups: number }> };
  activity: { seenLast24h: number; seenLast7d: number; seenLast30d: number; notSeenIn30d: number };
  securityContext: {
    onAnyWatchlist: number;
    criticality: {
      lowImpact: number;
      mediumImpact: number;
      highImpact: number;
      extremeImpact: number;
    };
  };
  enrichment: {
    attributes: Array<{ attribute: string; setTrue: number; setFalse: number }>;
    relationships: Array<{ type: string; entities: number }>;
  };
  collection: Array<{ part: string; outcome: CollectionOutcomePayload; durationMs: number }>;
}

interface ResolutionStateEvent {
  entityType: string;
  namespace: string;
  totalEntities: number;
  resolvedEntities: number;
  targetEntities: number;
  standaloneEntities: number;
  resolutionGroups: number;
  avgGroupSize: number;
  maxGroupSize: number;
}

interface EntityMaintainerRunSummaryFunnel {
  /** Entities or records scanned from source */
  scanned: number;
  /** Entities that passed business-logic qualification */
  qualified: number;
  /**
   * Bulk-update objects built after cross-source merge; omitted when the
   * maintainer has no distinct proposal phase (relationship and resolution
   * maintainers go straight from qualified → applied).
   */
  proposed?: number;
  /** Writes successfully applied to the entity store */
  applied: number;
  /** 404 bulk errors — entity absent from store; omitted when not applicable */
  droppedNotInStore?: number;
  /** Target EUIDs pruned because they don't exist in the entity store; omitted when not applicable */
  targetIdsNotInStore?: number;
  /** Entities intentionally skipped (ambiguous, deferred); omitted when not applicable */
  skipped?: number;
  /** Non-404 write errors */
  failed: number;
  /** Relationship metadata docs successfully appended to the metadata datastream; omitted when not applicable */
  metadataDocsApplied?: number;
  /** Relationship metadata docs that failed to append; omitted when not applicable */
  metadataDocsFailed?: number;
}

interface EntityMaintainerRunSummarySource {
  /** Integration or logical input id (e.g. "aws_cloudtrail") */
  id: string;
  /** Records scanned from this source */
  scanned: number;
  /** Records that qualified from this source */
  qualified: number;
  /** Source outcome: index_missing | empty | partial | producing | error */
  outcome: 'index_missing' | 'empty' | 'partial' | 'producing' | 'error';
  /** Entity writes that landed in the store for this source */
  applied?: number;
  /** Which step threw. Present only when outcome is "error" */
  failedStage?: string;
}

interface EntityMaintainerRunSummaryBreakdown {
  /** Relationship kind or sub-category name */
  name: string;
  /** Applied writes for this breakdown entry */
  count: number;
}

interface EntityMaintainerRunSummaryStage {
  /** Stage name (fixed enum per maintainer) */
  name: string;
  /** Stage outcome: success | error | skipped */
  status: 'success' | 'error' | 'skipped';
  /** Stage duration in milliseconds */
  durationMs: number;
  /** Fixed enum per maintainer when status is skipped */
  skipReason?: string;
  /** Fixed enum per maintainer when status is error */
  errorKind?: string;
  /** Stage-specific applied count rolling up into funnel.applied */
  applied?: number;
}

export interface EntityMaintainerRunSummaryEvent {
  /** Entity maintainer identifier */
  id: string;
  /** Kibana space the maintainer runs in (e.g. "default") */
  namespace: string;
  /** UUID shared by all events from one scheduled run; joins to logs */
  runId: string;
  /** Sub-run discriminator: entity_type for risk score, rule for resolution rules */
  scope?: {
    /** Scope discriminator kind (e.g. "entity_type") */
    kind: string;
    /** Scope value (e.g. "host", "user", "service", "generic") */
    value: string;
  };
  /** Total run duration in milliseconds */
  durationMs: number;
  /** Number of outer-loop pagination passes consumed during the run */
  iterations?: number;
  /** Run hit a hard-coded pagination or query ceiling and stopped voluntarily */
  truncated?: boolean;
  /** Run was cut short by an external abort signal */
  aborted: boolean;
  /** Sanitised error class name, set only on error */
  errorClass?: string;
  /** Error message capped at 500 chars, set only on error */
  errorMessage?: string;
  funnel: EntityMaintainerRunSummaryFunnel;
  /**
   * Per-source pre-merge funnel: counts how many records each integration or logical input
   * contributed, before cross-source deduplication. Answers "where did the inputs come from?".
   * Pairs with breakdown, which counts outputs by relationship kind. Omitted when not applicable.
   */
  sources?: EntityMaintainerRunSummarySource[];
  /**
   * Per-relationship-kind split of applied writes: counts outputs after the merge, grouped by
   * what was written (e.g. relationship type, sub-category). Answers "what was produced?".
   * Pairs with sources, which counts inputs by integration. Omitted when not applicable.
   */
  breakdown?: EntityMaintainerRunSummaryBreakdown[];
  /** Per-stage execution detail for multi-stage maintainers; omitted when not applicable */
  stages?: EntityMaintainerRunSummaryStage[];
}

// ------------------------------------
// Event definitions
// ------------------------------------

export const ENTITY_STORE_INITIALIZATION_EVENT = {
  eventType: 'entity_store_initialization',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<InitializationEvent>;

export const ENTITY_STORE_INITIALIZATION_FAILURE_EVENT = {
  eventType: 'entity_store_initialization_failure',
  schema: {
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for a resource initialization failure',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<InitializationFailureEvent>;

export const ENTITY_STORE_DELETION_EVENT = {
  eventType: 'entity_store_deletion',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<DeletionEvent>;

const riskScoreDistributionSchema = (scoreKind: 'base' | 'resolution') => {
  const scoreField =
    scoreKind === 'base'
      ? 'entity.risk.calculated_score_norm'
      : 'entity.relationships.resolution.risk.calculated_score_norm';
  return {
    _meta: {
      optional: true,
      description: `Distribution of ${scoreKind} risk scores for all entities of this type currently in the store`,
    },
    properties: {
      critical: {
        type: 'long' as const,
        _meta: {
          optional: true,
          description: `Entities of this type whose ${scoreKind} risk band is Critical`,
        },
      },
      high: {
        type: 'long' as const,
        _meta: {
          optional: true,
          description: `Entities of this type whose ${scoreKind} risk band is High`,
        },
      },
      moderate: {
        type: 'long' as const,
        _meta: {
          optional: true,
          description: `Entities of this type whose ${scoreKind} risk band is Moderate`,
        },
      },
      low: {
        type: 'long' as const,
        _meta: {
          optional: true,
          description: `Entities of this type whose ${scoreKind} risk band is Low`,
        },
      },
      unknown: {
        type: 'long' as const,
        _meta: {
          optional: true,
          description: `Entities of this type whose ${scoreKind} risk band is Unknown or missing`,
        },
      },
      normP50: {
        type: 'float' as const,
        _meta: {
          optional: true,
          description: `Median ${scoreField} for entities of this type that have a ${scoreKind} score`,
        },
      },
      normP90: {
        type: 'float' as const,
        _meta: {
          optional: true,
          description: `90th percentile ${scoreField} for entities of this type that have a ${scoreKind} score`,
        },
      },
    },
  } as const;
};

export const ENTITY_STORE_USAGE_EVENT = {
  eventType: 'entity_store_usage',
  schema: {
    storeSize: {
      type: 'long',
      _meta: {
        description: 'Number of entities stored in the entity store by type and namespace',
      },
    },
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
    sources: {
      properties: {
        DYNAMIC_KEY: {
          type: 'long',
          _meta: {
            description: 'Entities of this type with this source',
          },
        },
      },
      _meta: {
        optional: true,
        description:
          'Count of entities by entity.source. Keys are source values with dots replaced by __. The key "other" counts sources past the reported limit. An entity with several sources is counted once per source, so these counts can exceed storeSize',
      },
    },
    baseScoreDistribution: riskScoreDistributionSchema('base'),
    resolutionScoreDistribution: riskScoreDistributionSchema('resolution'),
  },
} as const satisfies EventTypeOpts<StoreUsageEventPayload>;

export const ENTITY_STORE_METADATA_USAGE_EVENT = {
  eventType: 'entity_store_metadata_usage',
  schema: {
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the metadata datastream lives (e.g. "default")',
      },
    },
    docCount: {
      type: 'long',
      _meta: {
        description: 'Total documents in the entity metadata datastream (.entities.v2.metadata.*)',
      },
    },
  },
} as const satisfies EventTypeOpts<MetadataUsageEventPayload>;

export const ENTITY_MAINTAINER_EVENT = {
  eventType: 'entity_store_entity_maintainer',
  schema: {
    id: {
      type: 'keyword',
      _meta: {
        description: 'Entity maintainer identifier',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the maintainer runs (e.g. "default")',
        optional: true,
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description:
          'Entity maintainer telemetry event type (register, abort, setup, run, error, stop, start, delete)',
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Optional error message for error events',
        optional: true,
      },
    },
  },
} as const satisfies EventTypeOpts<EntityMaintainerEvent>;

export const ENTITY_MAINTAINER_RUN_SUMMARY_EVENT = {
  eventType: 'entity_store_entity_maintainer_run_summary',
  schema: {
    id: {
      type: 'keyword',
      _meta: { description: 'Entity maintainer identifier' },
    },
    namespace: {
      type: 'keyword',
      _meta: { description: 'Kibana space the maintainer runs in (e.g. "default")' },
    },
    runId: {
      type: 'keyword',
      _meta: { description: 'UUID shared by all events from one scheduled run; joins to logs' },
    },
    scope: {
      properties: {
        kind: {
          type: 'keyword',
          _meta: { description: 'Scope discriminator kind (e.g. "entity_type", "rule")' },
        },
        value: {
          type: 'keyword',
          _meta: { description: 'Scope value (e.g. "host", "user", or a resolution rule id)' },
        },
      },
      _meta: {
        optional: true,
        description:
          'Sub-run discriminator: entity_type for risk score (one event per entity type), rule for resolution rules (one event per rule)',
      },
    },
    durationMs: {
      type: 'long',
      _meta: { description: 'Total run duration in milliseconds' },
    },
    iterations: {
      type: 'long',
      _meta: {
        optional: true,
        description: 'Number of outer-loop pagination passes consumed during the run',
      },
    },
    truncated: {
      type: 'boolean',
      _meta: {
        optional: true,
        description: 'Run hit a hard-coded pagination or query ceiling and stopped voluntarily',
      },
    },
    aborted: {
      type: 'boolean',
      _meta: { description: 'Run was cut short by an external abort signal' },
    },
    errorClass: {
      type: 'keyword',
      _meta: { optional: true, description: 'Sanitised error class name, set only on error' },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        optional: true,
        description: 'Error message capped at 500 chars, set only on error',
      },
    },
    funnel: {
      properties: {
        scanned: {
          type: 'long',
          _meta: { description: 'Entities or records scanned from source' },
        },
        qualified: {
          type: 'long',
          _meta: { description: 'Entities that passed business-logic qualification' },
        },
        proposed: {
          type: 'long',
          _meta: {
            optional: true,
            description:
              'Bulk-update objects built after cross-source merge; omitted when the maintainer has no distinct proposal phase (relationship and resolution maintainers go straight from qualified → applied)',
          },
        },
        applied: {
          type: 'long',
          _meta: { description: 'Writes successfully applied to the entity store' },
        },
        droppedNotInStore: {
          type: 'long',
          _meta: {
            optional: true,
            description: '404 bulk errors — entity absent from store; omitted when not applicable',
          },
        },
        targetIdsNotInStore: {
          type: 'long',
          _meta: {
            optional: true,
            description:
              "Target EUIDs pruned because they don't exist in the entity store; omitted when not applicable",
          },
        },
        skipped: {
          type: 'long',
          _meta: {
            optional: true,
            description:
              'Entities intentionally skipped (ambiguous, deferred); omitted when not applicable',
          },
        },
        failed: {
          type: 'long',
          _meta: { description: 'Non-404 write errors' },
        },
        metadataDocsApplied: {
          type: 'long',
          _meta: {
            optional: true,
            description:
              'Relationship metadata docs successfully appended to the metadata datastream; omitted when not applicable',
          },
        },
        metadataDocsFailed: {
          type: 'long',
          _meta: {
            optional: true,
            description:
              'Relationship metadata docs that failed to append; omitted when not applicable',
          },
        },
      },
    },
    sources: {
      type: 'array',
      items: {
        properties: {
          id: {
            type: 'keyword',
            _meta: { description: 'Integration or logical input id (e.g. "aws_cloudtrail")' },
          },
          scanned: {
            type: 'long',
            _meta: { description: 'Records scanned from this source' },
          },
          qualified: {
            type: 'long',
            _meta: { description: 'Records that qualified from this source' },
          },
          outcome: {
            type: 'keyword',
            _meta: {
              description: 'Source outcome: index_missing | empty | partial | producing | error',
            },
          },
          applied: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'Entity writes that landed in the store for this source',
            },
          },
          failedStage: {
            type: 'keyword',
            _meta: {
              optional: true,
              description:
                'Which step threw for this source. Present only when outcome is "error". Currently fetch-actors | fetch-targets | entity-write | metadata-write, but new stages may be added, so group by this field rather than enumerating it',
            },
          },
        },
      },
      _meta: {
        optional: true,
        description:
          'Per-source pre-merge funnel: counts how many records each integration or logical input contributed, before cross-source deduplication. Answers "where did the inputs come from?". Pairs with breakdown, which counts outputs by relationship kind. Omitted when not applicable.',
      },
    },
    breakdown: {
      type: 'array',
      items: {
        properties: {
          name: {
            type: 'keyword',
            _meta: { description: 'Relationship kind or sub-category name' },
          },
          count: {
            type: 'long',
            _meta: { description: 'Applied writes for this breakdown entry' },
          },
        },
      },
      _meta: {
        optional: true,
        description:
          'Per-relationship-kind split of applied writes: counts outputs after the merge, grouped by what was written (e.g. relationship type, sub-category). Answers "what was produced?". Pairs with sources, which counts inputs by integration. Omitted when not applicable.',
      },
    },
    stages: {
      type: 'array',
      items: {
        properties: {
          name: {
            type: 'keyword',
            _meta: { description: 'Stage name (fixed enum per maintainer)' },
          },
          status: {
            type: 'keyword',
            _meta: { description: 'Stage outcome: success | error | skipped' },
          },
          durationMs: {
            type: 'long',
            _meta: { description: 'Stage duration in milliseconds' },
          },
          skipReason: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Fixed enum per maintainer when status is skipped',
            },
          },
          errorKind: {
            type: 'keyword',
            _meta: {
              optional: true,
              description: 'Fixed enum per maintainer when status is error',
            },
          },
          applied: {
            type: 'long',
            _meta: {
              optional: true,
              description: 'Stage-specific applied count rolling up into funnel.applied',
            },
          },
        },
      },
      _meta: {
        optional: true,
        description:
          'Per-stage execution detail for multi-stage maintainers; omitted when not applicable',
      },
    },
  },
} as const satisfies EventTypeOpts<EntityMaintainerRunSummaryEvent>;

export const ENTITY_STORE_RESOLUTION_LINK_EVENT = {
  eventType: 'entity_store_resolution_link',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description:
          'Entity type of the resolution group (e.g. "user", "host", "service", "generic")',
      },
    },
    entitiesLinked: {
      type: 'long',
      _meta: {
        description: 'Number of entities successfully linked to the target',
      },
    },
    entitiesSkipped: {
      type: 'long',
      _meta: {
        description: 'Number of entities skipped because they were already linked to the target',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space where the link operation was performed (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionLinkEvent>;

export const ENTITY_STORE_RESOLUTION_UNLINK_EVENT = {
  eventType: 'entity_store_resolution_unlink',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description:
          'Entity type of the resolution group (e.g. "user", "host", "service", "generic")',
      },
    },
    entitiesUnlinked: {
      type: 'long',
      _meta: {
        description: 'Number of alias entities successfully unlinked',
      },
    },
    entitiesSkipped: {
      type: 'long',
      _meta: {
        description: 'Number of non-alias entities silently skipped',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space where the unlink operation was performed (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionUnlinkEvent>;

export const ENTITY_STORE_RESOLUTION_GROUP_VIEW_EVENT = {
  eventType: 'entity_store_resolution_group_view',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description:
          'Entity type of the resolution group (e.g. "user", "host", "service", "generic")',
      },
    },
    groupSize: {
      type: 'long',
      _meta: {
        description: 'Total number of entities in the resolution group (target plus aliases)',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space where the group view was requested (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionGroupViewEvent>;

export const ENTITY_STORE_RESOLUTION_STATE_EVENT = {
  eventType: 'entity_store_resolution_state',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Entity type for this snapshot (e.g. "user", "host", "service", "generic")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space the entity store belongs to (e.g. "default")',
      },
    },
    totalEntities: {
      type: 'long',
      _meta: {
        description: 'Total number of entity documents of this type in the store',
      },
    },
    resolvedEntities: {
      type: 'long',
      _meta: {
        description:
          'Number of entities that have a resolved_to field (i.e. are aliases in a resolution group)',
      },
    },
    targetEntities: {
      type: 'long',
      _meta: {
        description:
          'Number of distinct resolution targets (entities that other entities resolve to)',
      },
    },
    standaloneEntities: {
      type: 'long',
      _meta: {
        description:
          'Number of entities that are neither aliases nor targets — not involved in any resolution group',
      },
    },
    resolutionGroups: {
      type: 'long',
      _meta: {
        description:
          'Number of resolution groups (each group has one target and one or more aliases)',
      },
    },
    avgGroupSize: {
      type: 'float',
      _meta: {
        description:
          'Average number of entities per resolution group (target + aliases); 0 when no groups exist',
      },
    },
    maxGroupSize: {
      type: 'long',
      _meta: {
        description: 'Largest resolution group size (target + aliases); 0 when no groups exist',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionStateEvent>;

export const ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT = {
  eventType: 'entity_store_resolution_rules_state',
  schema: {
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space the resolution rules belong to (e.g. "default")',
      },
    },
    rules: {
      type: 'array',
      items: {
        properties: {
          id: {
            type: 'keyword',
            _meta: { description: 'Resolution rule identifier (e.g. "email_exact_match")' },
          },
          enabled: {
            type: 'boolean',
            _meta: { description: 'Whether the rule is enabled in this space' },
          },
          defaultEnabled: {
            type: 'boolean',
            _meta: { description: 'Whether the rule is enabled by default' },
          },
        },
      },
      _meta: {
        description: 'Effective enabled state of every resolution rule in this space',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionRulesStateEvent>;

export const ENTITY_STORE_RESOLUTION_ERROR_EVENT = {
  eventType: 'entity_store_resolution_error',
  schema: {
    errorType: {
      type: 'keyword',
      _meta: {
        description:
          'Resolution error category (e.g. "self_link", "chain_resolution", "entities_not_found")',
      },
    },
    operation: {
      type: 'keyword',
      _meta: {
        description: 'Resolution API operation that failed (link, unlink, or group)',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Kibana space where the failed operation was attempted (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<ResolutionErrorEvent>;

const countField = (description: string) => ({ type: 'long', _meta: { description } } as const);

const keywordField = (description: string) =>
  ({ type: 'keyword', _meta: { description } } as const);

export const ENTITY_STORE_SOURCE_STATE_EVENT = {
  eventType: 'entity_store_source_state',
  schema: {
    namespace: keywordField('Kibana space the entity store belongs to (e.g. "default")'),
    entityType: keywordField('Entity type (e.g. "user", "host", "service", "generic")'),
    source: keywordField(
      'Value of entity.source (event.module, event.dataset or data_stream.dataset), the top 30 per type, the rest under "other"'
    ),
    sourceKind: keywordField(
      '"integration" when the source matches a Fleet-managed package, "custom" otherwise'
    ),
    entities: countField('Entities of this type that have this source'),
    resolved: countField('Entities from this source that are aliases in a resolution group'),
    targets: {
      type: 'long',
      _meta: {
        optional: true,
        description:
          'Entities from this source that are resolution targets. Omitted if not collected',
      },
    },
    standalone: {
      type: 'long',
      _meta: {
        optional: true,
        description: 'Entities from this source in no resolution group. Omitted if not collected',
      },
    },
    withRiskScore: countField('Entities from this source that have a risk score'),
    onWatchlist: {
      properties: {
        managed: countField('Entities on a managed (prebuilt) watchlist'),
        custom: countField('Entities on a custom watchlist'),
      },
    },
    byPrimaryIdentifier: {
      type: 'array',
      items: {
        properties: {
          identifier: keywordField('Identifier that built the entity id (e.g. "user.email")'),
          entities: countField('Entities whose id was built from this identifier'),
        },
      },
      _meta: {
        optional: true,
        description: 'Only for user and host. Omitted if not collected',
      },
    },
  },
} as const satisfies EventTypeOpts<EntitySourceStateEventPayload>;

export const ENTITY_STORE_ENTITY_METADATA_EVENT = {
  eventType: 'entity_store_entity_metadata',
  schema: {
    namespace: keywordField('Kibana space the entity store belongs to (e.g. "default")'),
    entityType: keywordField('Entity type (e.g. "user", "host", "service", "generic")'),
    totalEntities: countField('Entities of this type in the store'),
    origin: {
      properties: {
        withMultipleSources: countField('Entities seen in more than one source'),
        withoutSource: countField('Entities with no entity.source'),
        byCreator: {
          type: 'array',
          items: {
            properties: {
              creator: keywordField(
                'What created the entity: "logs_extraction" or "risk_score_maintainer"'
              ),
              entities: countField('Entities created this way'),
            },
          },
          _meta: {
            description: 'Entities by creator. A missing entity.created_by is logs_extraction',
          },
        },
        byIdentityProvider: {
          type: 'array',
          items: {
            properties: {
              provider: keywordField(
                'entity.namespace of the user (e.g. "okta", "entra_id", "local")'
              ),
              entities: countField('Users with this entity.namespace'),
            },
          },
          _meta: { optional: true, description: 'Only for user' },
        },
      },
    },
    identifiers: {
      properties: {
        byPrimaryIdentifier: {
          type: 'array',
          items: {
            properties: {
              identifier: keywordField('Identifier that built the entity id (e.g. "host.name")'),
              entities: countField('Entities whose id was built from this identifier'),
            },
          },
          _meta: { description: 'Entities by the identifier that built their id' },
        },
      },
      _meta: { optional: true, description: 'Only for user and host. Omitted if not collected' },
    },
    unlinkedDuplicates: {
      properties: {
        sameIdDifferentCase: {
          properties: {
            groups: countField('Groups of entities whose ids are equal after lowercasing'),
            entities: countField('Entities in those groups'),
            largestGroup: countField('Size of the largest group'),
          },
          _meta: {
            optional: true,
            description: 'Only for user and host. Omitted if not collected',
          },
        },
        sameValueAcrossSources: {
          type: 'array',
          items: {
            properties: {
              sourceA: keywordField('First source of the pair'),
              sourceB: keywordField('Second source of the pair'),
              field: keywordField('Field the entities share (user.email, user.name or user.id)'),
              sharedValues: countField('Values of the field seen in both sources'),
              alreadyLinked: countField(
                'Shared values whose entities are already resolved together'
              ),
            },
          },
          _meta: {
            optional: true,
            description: 'Only for user, top 10 pairs. Omitted if not collected',
          },
        },
      },
    },
    resolution: {
      properties: {
        groupSizes: {
          type: 'array',
          items: {
            properties: {
              size: countField('Entities in the group (target + aliases)'),
              groups: countField('Resolution groups of this size'),
            },
          },
          _meta: { description: 'Exact number of resolution groups per group size' },
        },
      },
    },
    activity: {
      properties: {
        seenLast24h: countField('Entities last seen in the last 24 hours'),
        seenLast7d: countField('Entities last seen in the last 7 days'),
        seenLast30d: countField('Entities last seen in the last 30 days'),
        notSeenIn30d: countField('Entities not seen in the last 30 days'),
      },
    },
    securityContext: {
      properties: {
        onAnyWatchlist: countField('Entities on at least one watchlist'),
        criticality: {
          properties: {
            lowImpact: countField('Entities with low_impact asset criticality'),
            mediumImpact: countField('Entities with medium_impact asset criticality'),
            highImpact: countField('Entities with high_impact asset criticality'),
            extremeImpact: countField('Entities with extreme_impact asset criticality'),
          },
        },
      },
    },
    enrichment: {
      properties: {
        attributes: {
          type: 'array',
          items: {
            properties: {
              attribute: keywordField('entity.attributes boolean (asset, managed, mfa_enabled)'),
              setTrue: countField('Entities where it is true'),
              setFalse: countField('Entities where it is false'),
            },
          },
          _meta: { description: 'Boolean entity attributes' },
        },
        relationships: {
          type: 'array',
          items: {
            properties: {
              type: keywordField('Relationship type (e.g. "owns", "communicates_with")'),
              entities: countField('Entities with at least one relationship of this type'),
            },
          },
          _meta: { description: 'Entities per relationship type' },
        },
      },
    },
    collection: {
      type: 'array',
      items: {
        properties: {
          part: keywordField('Expensive query that ran on its own (e.g. "sameIdDifferentCase")'),
          outcome: keywordField('"complete", "timed_out", "failed" or "skipped"'),
          durationMs: countField('How long the part took in milliseconds'),
        },
      },
      _meta: {
        description:
          'Outcome of each isolated part. A part that did not complete is left out above',
      },
    },
  },
} as const satisfies EventTypeOpts<EntityMetadataEventPayload>;

export const ENTITY_STORE_HEALTH_REPORT_EVENT = {
  eventType: 'entity_store_health_report',
  schema: {
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entity store health is reported (e.g. "default")',
      },
    },
    engines: {
      type: 'array',
      items: {
        properties: {
          type: {
            type: 'keyword',
            _meta: { description: 'Engine type (e.g "host" or "generic")' },
          },
          status: {
            type: 'keyword',
            _meta: {
              description: 'Overall engine status',
            },
          },
          components: {
            type: 'array',
            items: {
              properties: {
                id: {
                  type: 'keyword',
                  _meta: { description: 'Component identifier' },
                },
                resource: {
                  type: 'keyword',
                  _meta: {
                    description: 'Type of the component (e.g. "index" or "task")',
                  },
                },
                installed: {
                  type: 'boolean',
                  _meta: { description: 'Whether the component is installed' },
                },
                status: {
                  type: 'keyword',
                  _meta: {
                    optional: true,
                    description: 'Task component status when the component is a task',
                  },
                },
                lastError: {
                  type: 'keyword',
                  _meta: {
                    optional: true,
                    description: 'Task component last error message, when present',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies EventTypeOpts<EntityStoreHealthReportPayload>;

// ------------------------------------
// Registration
// ------------------------------------

const events = [
  ENTITY_STORE_INITIALIZATION_EVENT,
  ENTITY_STORE_INITIALIZATION_FAILURE_EVENT,
  ENTITY_STORE_DELETION_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  ENTITY_STORE_METADATA_USAGE_EVENT,
  ENTITY_STORE_HEALTH_REPORT_EVENT,
  ENTITY_MAINTAINER_EVENT,
  ENTITY_MAINTAINER_RUN_SUMMARY_EVENT,
  ENTITY_STORE_RESOLUTION_LINK_EVENT,
  ENTITY_STORE_RESOLUTION_UNLINK_EVENT,
  ENTITY_STORE_RESOLUTION_GROUP_VIEW_EVENT,
  ENTITY_STORE_RESOLUTION_ERROR_EVENT,
  ENTITY_STORE_RESOLUTION_STATE_EVENT,
  ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT,
  ENTITY_STORE_SOURCE_STATE_EVENT,
  ENTITY_STORE_ENTITY_METADATA_EVENT,
] as const;

export const registerTelemetry = (analytics: AnalyticsServiceSetup) =>
  events.forEach((eventConfig: EventTypeOpts<{}>) => analytics.registerEventType(eventConfig));

// ------------------------------------
// Type-safe reporting
// ------------------------------------

interface TelemetryEventMap {
  [ENTITY_STORE_INITIALIZATION_EVENT.eventType]: InitializationEvent;
  [ENTITY_STORE_DELETION_EVENT.eventType]: DeletionEvent;
  [ENTITY_STORE_INITIALIZATION_FAILURE_EVENT.eventType]: InitializationFailureEvent;
  [ENTITY_STORE_USAGE_EVENT.eventType]: StoreUsageEventPayload;
  [ENTITY_STORE_METADATA_USAGE_EVENT.eventType]: MetadataUsageEventPayload;
  [ENTITY_STORE_HEALTH_REPORT_EVENT.eventType]: EntityStoreHealthReportPayload;
  [ENTITY_MAINTAINER_EVENT.eventType]: EntityMaintainerEvent;
  [ENTITY_MAINTAINER_RUN_SUMMARY_EVENT.eventType]: EntityMaintainerRunSummaryEvent;
  [ENTITY_STORE_RESOLUTION_LINK_EVENT.eventType]: ResolutionLinkEvent;
  [ENTITY_STORE_RESOLUTION_UNLINK_EVENT.eventType]: ResolutionUnlinkEvent;
  [ENTITY_STORE_RESOLUTION_GROUP_VIEW_EVENT.eventType]: ResolutionGroupViewEvent;
  [ENTITY_STORE_RESOLUTION_ERROR_EVENT.eventType]: ResolutionErrorEvent;
  [ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType]: ResolutionStateEvent;
  [ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT.eventType]: ResolutionRulesStateEvent;
  [ENTITY_STORE_SOURCE_STATE_EVENT.eventType]: EntitySourceStateEventPayload;
  [ENTITY_STORE_ENTITY_METADATA_EVENT.eventType]: EntityMetadataEventPayload;
}

export type TelemetryReporter = ReturnType<typeof createReportEvent>;

export const createReportEvent = (analytics: Pick<AnalyticsServiceSetup, 'reportEvent'>) => ({
  reportEvent: <T extends (typeof events)[number]>(
    event: T,
    eventData: TelemetryEventMap[T['eventType']]
  ) => analytics.reportEvent(event.eventType, eventData),
});
