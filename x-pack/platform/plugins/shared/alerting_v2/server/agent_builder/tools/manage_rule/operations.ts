/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import {
  isSavedObjectErrorResult,
  type SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import {
  DASHBOARD_ARTIFACT_TYPE,
  RUNBOOK_ARTIFACT_TYPE,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  createRuleDataSchema,
  metadataSchema,
  ruleKindSchema,
  scheduleSchema,
  querySchema,
  recoveryStrategySchema,
  noDataStrategySchema,
  getRootEsqlQuery,
  groupingSchema,
  stateTransitionSchema,
  isStateTransitionAllowed,
  isSignalUsingStandaloneFormat,
  isSignalQueryBreachOnly,
  isRecoveryDelayAllowed,
  isRecoveryQueryConsistentWithStrategy,
  isRecoveryQueryProvidedForStrategy,
  isNoDataQueryConsistentWithStrategy,
  isNoDataQueryProvidedForStrategy,
} from '@kbn/alerting-v2-schemas';
import { resolveArtifactId } from '@kbn/alerting-v2-utils';
import { dashboardIdSchema } from '../../../lib/artifact_types';
import { buildRulePayload } from '../../../../common/agent_builder/rule_mappers';
import { AGENT_BUILDER_TAG } from '../../common/constants';
import { resolveTimeFieldForQuery } from './resolve_time_field';

type RuleArtifact = NonNullable<RuleAttachmentData['artifacts']>[number];

type DashboardArtifact = RuleArtifact & {
  type: typeof DASHBOARD_ARTIFACT_TYPE;
  data: { dashboardId: string };
};

type RunbookArtifact = RuleArtifact & {
  type: typeof RUNBOOK_ARTIFACT_TYPE;
  data: { content: string };
};

const isDashboardArtifact = (artifact: RuleArtifact): artifact is DashboardArtifact =>
  artifact.type === DASHBOARD_ARTIFACT_TYPE;

const isRunbookArtifact = (artifact: RuleArtifact): artifact is RunbookArtifact =>
  artifact.type === RUNBOOK_ARTIFACT_TYPE;

// Mirrors the `tagsSchema` cap in @kbn/alerting-v2-schemas (max 20 tags). Kept
// local to avoid forcing an export purely for this guard.
const MAX_RULE_TAGS = 20;

// Mirrors `artifactsSchema.max(100)` in @kbn/alerting-v2-schemas.
const MAX_RULE_ARTIFACTS = 100;

// Saved-object type for Kibana dashboards. Same string as DASHBOARD_ARTIFACT_TYPE
// but a different concept (SO type vs rule artifact type).
const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

/**
 * Ensures the agent-builder provenance tag is present without clobbering any
 * tags the user or LLM already set. Skips silently if the tag cap is already
 * reached, so we never push a payload that fails schema validation.
 */
const withAgentBuilderTag = (tags: string[] | undefined): string[] => {
  const existing = tags ?? [];
  if (existing.includes(AGENT_BUILDER_TAG) || existing.length >= MAX_RULE_TAGS) {
    return existing;
  }
  return [...existing, AGENT_BUILDER_TAG];
};

/**
 * Maps dashboard saved-object IDs onto `dashboard` artifacts in the create/update
 * API shape. Reuses an existing artifact `id` when the same dashboard is already
 * attached so repeated `set_dashboards` calls do not churn identifiers.
 */
const toDashboardArtifacts = (
  dashboardIds: string[],
  existingArtifacts: DashboardArtifact[]
): DashboardArtifact[] => {
  const existingIdByDashboardId = new Map<string, string>();
  for (const artifact of existingArtifacts) {
    existingIdByDashboardId.set(artifact.data.dashboardId, artifact.id);
  }

  const seen = new Set<string>();
  const dashboards: DashboardArtifact[] = [];
  for (const dashboardId of dashboardIds) {
    if (seen.has(dashboardId)) {
      continue;
    }
    seen.add(dashboardId);
    dashboards.push({
      id: resolveArtifactId(DASHBOARD_ARTIFACT_TYPE, existingIdByDashboardId.get(dashboardId)),
      type: DASHBOARD_ARTIFACT_TYPE,
      data: { dashboardId },
    });
  }
  return dashboards;
};

/** True when content is missing or blank after trim — treated as unlink. */
const isRunbookUnlinkContent = (content: string | null): content is null =>
  content == null || content.trim().length === 0;

/**
 * Maps markdown onto a single `runbook` artifact in the create/update API shape.
 * Reuses the first existing runbook `id` so replace does not churn identifiers.
 */
const toRunbookArtifact = (
  content: string,
  existingArtifacts: RunbookArtifact[]
): RunbookArtifact => ({
  id: resolveArtifactId(RUNBOOK_ARTIFACT_TYPE, existingArtifacts[0]?.id),
  type: RUNBOOK_ARTIFACT_TYPE,
  data: { content },
});

// ─── Operation schemas ────────────────────────────────────────────────────────
// Every field-level schema is derived from the shared alerting-v2-schemas
// parent objects (via .shape / .unwrap()) so that tool-level validation
// stays in sync with the CRUD API constraints automatically.

export const setMetadataOperationSchema = metadataSchema
  .partial()
  .omit({ owner: true })
  .extend({ operation: z.literal('set_metadata') })
  .describe(
    'Use `set_metadata` to name the rule and add a description or tags so the user can filter by it later.'
  );

export const setKindOperationSchema = z
  .object({
    operation: z.literal('set_kind'),
    kind: ruleKindSchema,
  })
  .describe(
    "Use `set_kind` to choose a rule kind matching the user's goal: detect and respond (`alert`) or collect evidence (`signal`)."
  );

export const setScheduleOperationSchema = scheduleSchema
  .partial()
  .extend({ operation: z.literal('set_schedule') })
  .describe(
    'Use `set_schedule` to control how often the rule runs (`every`) and how far back each run looks (`lookback`).'
  );

export const setQueryOperationSchema = z
  .object({
    operation: z.literal('set_query'),
    query: querySchema,
    recovery_strategy: recoveryStrategySchema.optional(),
    no_data_strategy: noDataStrategySchema.optional(),
  })
  .describe(
    'Use `set_query` to define the ES|QL condition that should fire the rule. Optionally set how recovery is detected and what happens when data stops arriving.'
  );

export const setGroupingOperationSchema = groupingSchema
  .extend({
    operation: z.literal('set_grouping'),
  })
  .describe(
    'Use `set_grouping` to split alerts by entity (host, service, etc.) so each group has its own episode instead of one combined alert.'
  );

export const setStateTransitionOperationSchema = stateTransitionSchema
  .unwrap()
  .unwrap()
  .omit({ pending_operator: true, recovering_operator: true })
  .extend({ operation: z.literal('set_state_transition') })
  .describe(
    'Use `set_state_transition` to delay alert firing until the threshold is breached N times in a row. This reduces noise from transient spikes. State transition is only allowed on `kind: alert` rules.'
  );

export const setDashboardsOperationSchema = z
  .object({
    operation: z.literal('set_dashboards'),
    dashboard_ids: z
      .array(dashboardIdSchema.describe('Dashboard saved-object ID.'))
      .max(MAX_RULE_ARTIFACTS)
      .describe(
        'Dashboard saved-object IDs to link as investigation artifacts on the rule. Each ID must be an existing dashboard the current user can read. Replaces previously linked dashboards. Pass an empty array to unlink all dashboards.'
      ),
  })
  .describe(
    'Use `set_dashboards` to link investigation dashboards to the rule by saved-object ID. Each ID is stored as a `dashboard` artifact (`{ id, type: "dashboard", data: { dashboardId } }`), matching the create/update API. Replaces any previously linked dashboards; other artifacts (e.g. runbooks) are preserved. Pass an empty array to unlink all dashboards.'
  );

export const setRunbookOperationSchema = z
  .object({
    operation: z.literal('set_runbook'),
    content: z
      .string()
      .max(RUNBOOK_CONTENT_LIMIT)
      .nullable()
      .describe(
        `Markdown investigation steps. Stored as a \`runbook\` artifact (\`{ id, type: "runbook", data: { content } }\`). Replaces any previously attached runbook; other artifacts (e.g. dashboards) are preserved. Pass \`null\` or an empty string to unlink. Whitespace-only content is treated as unlink. Max ${RUNBOOK_CONTENT_LIMIT} characters.`
      ),
  })
  .describe(
    `Use \`set_runbook\` to attach investigation markdown to the rule. Stored as a \`runbook\` artifact (\`{ id, type: "runbook", data: { content } }\`), matching the create/update API. Replaces any previously attached runbook; other artifacts (e.g. dashboards) are preserved. Pass \`null\` or an empty string to unlink. Whitespace-only content is treated as unlink. Content longer than ${RUNBOOK_CONTENT_LIMIT} characters is rejected.`
  );

export const validateOperationSchema = z
  .object({
    operation: z.literal('validate'),
  })
  .describe(
    'Use `validate` as the last operation to confirm the rule is complete and ready to save.'
  );

// ─── Discriminated union ──────────────────────────────────────────────────────

export const ruleOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  setKindOperationSchema,
  setScheduleOperationSchema,
  setQueryOperationSchema,
  setGroupingOperationSchema,
  setStateTransitionOperationSchema,
  setDashboardsOperationSchema,
  setRunbookOperationSchema,
  validateOperationSchema,
]);

export type RuleOperation = z.infer<typeof ruleOperationSchema>;

// ─── Validation errors ────────────────────────────────────────────────────────

/**
 * Thrown for user/agent-input validation failures (invalid ES|QL, unknown grouping
 * field, missing required fields). Distinguished from unexpected errors so the
 * caller can log them at a lower severity.
 */
export class RuleOperationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleOperationValidationError';
  }
}

/**
 * Confirms each ID is a dashboard saved object the current user can read.
 * Empty `dashboard_ids` (unlink all) skips the lookup.
 */
const assertDashboardsExist = async (
  savedObjectsClient: SavedObjectsClientContract,
  dashboardIds: string[]
): Promise<void> => {
  const uniqueIds = [...new Set(dashboardIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  try {
    const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(
      uniqueIds.map((id) => ({ type: DASHBOARD_SAVED_OBJECT_TYPE, id }))
    );
    const missing = savedObjects
      .filter(isSavedObjectErrorResult)
      .map((savedObject) => savedObject.id);
    if (missing.length > 0) {
      throw new RuleOperationValidationError(
        `Dashboard saved object(s) not found: ${missing.join(', ')}. ` +
          `Resolve dashboard titles to saved-object IDs before calling set_dashboards.`
      );
    }
  } catch (err) {
    if (err instanceof RuleOperationValidationError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new RuleOperationValidationError(`Could not verify dashboards: ${message}`);
  }
};

// ─── ES|QL query validation ───────────────────────────────────────────────────

export interface EsqlColumn {
  name: string;
  type: string;
}

export interface RuleOperationsResult {
  data: Partial<RuleAttachmentData>;
  queryColumns?: EsqlColumn[];
}

/**
 * Executes the query with `| LIMIT 0` appended to catch semantic errors
 * (unknown index, invalid field, etc.) without returning rows.
 * Returns the column metadata so downstream operations (e.g. set_grouping)
 * can validate field references against actual query output.
 */
async function validateEsqlQuery(
  esClient: IScopedClusterClient,
  query: string
): Promise<EsqlColumn[]> {
  try {
    const response = await esClient.asCurrentUser.esql.query({
      query: `${query} | LIMIT 0`,
      format: 'json',
    });
    return (response as { columns?: EsqlColumn[] }).columns ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new RuleOperationValidationError(`Invalid ES|QL query: ${message}`);
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export const executeRuleOperations = async (
  data: Partial<RuleAttachmentData>,
  operations: RuleOperation[],
  esClient: IScopedClusterClient | undefined,
  savedObjectsClient: SavedObjectsClientContract,
  { isNew = false }: { isNew?: boolean } = {}
): Promise<RuleOperationsResult> => {
  let next = { ...data };
  let lastQueryColumns: EsqlColumn[] | undefined;

  for (const op of operations) {
    switch (op.operation) {
      case 'set_metadata': {
        const mergedName = op.name ?? next.metadata?.name ?? '';
        next = {
          ...next,
          metadata: {
            ...next.metadata,
            name: mergedName,
            ...(op.description !== undefined ? { description: op.description } : {}),
            ...(op.tags !== undefined ? { tags: op.tags } : {}),
          },
        };
        break;
      }

      case 'set_kind':
        next = { ...next, kind: op.kind };
        break;

      case 'set_schedule': {
        const existingEvery = next.schedule?.every ?? '5m';
        next = {
          ...next,
          schedule: {
            ...next.schedule,
            every: op.every ?? existingEvery,
            ...(op.lookback !== undefined ? { lookback: op.lookback } : {}),
          },
        };
        break;
      }

      case 'set_query': {
        const rootQuery = getRootEsqlQuery(op.query);
        let resolvedTimeField: string | null | undefined;
        if (esClient) {
          lastQueryColumns = await validateEsqlQuery(esClient, rootQuery);
          // Resolve the time field from the index.
          resolvedTimeField = await resolveTimeFieldForQuery(esClient, rootQuery, next.time_field);
          // `null` means the index has no usable date field.
          if (resolvedTimeField === null) {
            const sourceIndex = getIndexPatternFromESQLQuery(rootQuery);
            throw new RuleOperationValidationError(
              `Could not determine a time field for the query: the source index ` +
                `${
                  sourceIndex ? `"${sourceIndex}"` : ''
                } has no \`date\` or \`date_nanos\` field ` +
                `(and no \`@timestamp\`), which is required for the rule's lookback window. ` +
                `Add a date field to the data, or query an index that has one.`
            );
          }
          // `undefined` means we couldn't look up the index (non-FROM query, or
          // fieldCaps failed). Fall back to any existing time field; if there is
          // none, fail rather than let the schema silently default to @timestamp.
          if (resolvedTimeField === undefined && !next.time_field) {
            throw new RuleOperationValidationError(
              `Could not determine a time field for the query and none is set. A \`date\` or ` +
                `\`date_nanos\` field is required for the rule's lookback window; set one explicitly.`
            );
          }
        }
        next = {
          ...next,
          query: op.query,
          ...(resolvedTimeField ? { time_field: resolvedTimeField } : {}),
          ...(op.recovery_strategy !== undefined
            ? { recovery_strategy: op.recovery_strategy }
            : {}),
          ...(op.no_data_strategy !== undefined ? { no_data_strategy: op.no_data_strategy } : {}),
        };

        if (!isRecoveryQueryConsistentWithStrategy(next)) {
          throw new RuleOperationValidationError(
            'query.recovery is only allowed when recovery_strategy is "query".'
          );
        }
        if (!isRecoveryQueryProvidedForStrategy(next)) {
          throw new RuleOperationValidationError(
            'recovery_strategy "query" requires a recovery block in the query ' +
              '(recovery: { segment } for composed, recovery: { query } for standalone).'
          );
        }
        if (!isNoDataQueryConsistentWithStrategy(next)) {
          throw new RuleOperationValidationError(
            'query.no_data is only allowed when no_data_strategy is set to a non-"none" value.'
          );
        }
        if (!isNoDataQueryProvidedForStrategy(next)) {
          throw new RuleOperationValidationError(
            'no_data_strategy (other than "none") requires a no_data block in the query ' +
              'for standalone-format rules.'
          );
        }
        break;
      }

      case 'set_grouping': {
        if (lastQueryColumns && lastQueryColumns.length > 0) {
          const columnNames = new Set(lastQueryColumns.map((c) => c.name));
          const missing = op.fields.filter((f) => !columnNames.has(f));
          if (missing.length > 0) {
            throw new RuleOperationValidationError(
              `Grouping fields not found in query output columns: ${missing.join(', ')}. ` +
                `Available columns: ${[...columnNames].join(', ')}`
            );
          }
        }
        next = {
          ...next,
          grouping: { fields: op.fields },
        };
        break;
      }

      case 'set_state_transition':
        next = {
          ...next,
          state_transition: {
            ...next.state_transition,
            ...(op.pending_count !== undefined ? { pending_count: op.pending_count } : {}),
            ...(op.pending_timeframe !== undefined
              ? { pending_timeframe: op.pending_timeframe }
              : {}),
            ...(op.recovering_count !== undefined ? { recovering_count: op.recovering_count } : {}),
            ...(op.recovering_timeframe !== undefined
              ? { recovering_timeframe: op.recovering_timeframe }
              : {}),
          },
        };
        break;

      case 'set_dashboards': {
        await assertDashboardsExist(savedObjectsClient, op.dashboard_ids);
        const existingArtifacts = next.artifacts ?? [];
        const otherArtifacts: RuleArtifact[] = [];
        const existingDashboardArtifacts: DashboardArtifact[] = [];
        for (const artifact of existingArtifacts) {
          if (isDashboardArtifact(artifact)) {
            existingDashboardArtifacts.push(artifact);
          } else {
            otherArtifacts.push(artifact);
          }
        }
        const dashboardArtifacts = toDashboardArtifacts(
          op.dashboard_ids,
          existingDashboardArtifacts
        );
        const artifacts = [...otherArtifacts, ...dashboardArtifacts];
        if (artifacts.length > MAX_RULE_ARTIFACTS) {
          throw new RuleOperationValidationError(
            `A rule can have at most ${MAX_RULE_ARTIFACTS} artifacts.`
          );
        }
        next = { ...next, artifacts };
        break;
      }

      case 'set_runbook': {
        const existingArtifacts = next.artifacts ?? [];
        const otherArtifacts: RuleArtifact[] = [];
        const existingRunbookArtifacts: RunbookArtifact[] = [];
        for (const artifact of existingArtifacts) {
          if (isRunbookArtifact(artifact)) {
            existingRunbookArtifacts.push(artifact);
          } else {
            otherArtifacts.push(artifact);
          }
        }
        const runbookArtifacts = isRunbookUnlinkContent(op.content)
          ? []
          : [toRunbookArtifact(op.content, existingRunbookArtifacts)];
        const artifacts = [...otherArtifacts, ...runbookArtifacts];
        if (artifacts.length > MAX_RULE_ARTIFACTS) {
          throw new RuleOperationValidationError(
            `A rule can have at most ${MAX_RULE_ARTIFACTS} artifacts.`
          );
        }
        next = { ...next, artifacts };
        break;
      }

      case 'validate': {
        const payload = buildRulePayload(next);
        const result = createRuleDataSchema.safeParse(payload);
        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new RuleOperationValidationError(`Rule is not ready to save:\n${issues}`);
        }
        break;
      }
    }
  }

  if (isNew && !next.metadata?.name) {
    throw new RuleOperationValidationError(
      'A rule name is required when creating a new rule. Use a set_metadata operation with a name.'
    );
  }

  // Stamp the agent-builder provenance tag on every rule created or edited via
  // Agent Builder so they can be measured (telemetry) and filtered in the Rules
  // list. Merged after all operations so it never overwrites user/LLM-provided
  // tags. Applied on edits too, so a rule that loses the tag regains it whenever
  // the agent touches it.
  if (next.metadata) {
    next = {
      ...next,
      metadata: {
        ...next.metadata,
        tags: withAgentBuilderTag(next.metadata.tags),
      },
    };
  }

  if (!isStateTransitionAllowed(next)) {
    throw new RuleOperationValidationError(
      'state_transition is only allowed when kind is "alert".'
    );
  }

  if (!isSignalUsingStandaloneFormat(next)) {
    throw new RuleOperationValidationError('kind "signal" requires query.format "standalone".');
  }

  if (!isSignalQueryBreachOnly(next)) {
    throw new RuleOperationValidationError(
      'Signal rules cannot set recovery_strategy or no_data_strategy.'
    );
  }

  if (!isRecoveryDelayAllowed(next)) {
    throw new RuleOperationValidationError(
      'state_transition.recovering_count and recovering_timeframe have no effect when recovery is disabled (recovery_strategy is "none" or unset).'
    );
  }

  return {
    data: next,
    ...(lastQueryColumns ? { queryColumns: lastQueryColumns } : {}),
  };
};
