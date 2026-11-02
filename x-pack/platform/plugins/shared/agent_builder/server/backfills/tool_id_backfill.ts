/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import pRetry from 'p-retry';
import type { Logger } from '@kbn/logging';
import type { ToolSelection } from '@kbn/agent-builder-common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StorageClientSearchRequest } from '@kbn/storage-adapter';
import type {
  AgentProfileStorage,
  AgentProperties,
} from '../services/agents/persisted/client/storage';
import { createStorage as createAgentStorage } from '../services/agents/persisted/client/storage';
import type { SkillStorage, SkillProperties } from '../services/skills/persisted/client/storage';
import { createStorage as createSkillStorage } from '../services/skills/persisted/client/storage';
import { updateRequestToEs } from '../services/agents/persisted/client/converters';

const PAGE_SIZE = 1000;

export interface ToolIdBackfillEntry {
  oldId: string;
  supplementalIds: string[];
}

/**
 * Registry of tool ID backfills. Add new entries here when tool IDs are
 * renamed or split. Each entry maps an old ID to one or more supplemental IDs
 * that should be added alongside it. The backfill runner applies all entries
 * idempotently on every startup.
 */
const TOOL_ID_BACKFILLS: ToolIdBackfillEntry[] = [
  {
    oldId: 'platform.core.cases.attachments',
    supplementalIds: [
      'platform.core.cases.get_attachments',
      'platform.core.cases.manage_attachments',
    ],
  },
];

/**
 * Appends supplemental tool IDs alongside an old ID in a ToolSelection array.
 * The old ID is kept. Idempotent: if all supplemental IDs already exist, the
 * original reference is returned unchanged.
 */
export const addToolIdsToToolSelection = (
  tools: ToolSelection[],
  oldId: string,
  supplementalIds: string[]
): ToolSelection[] => {
  let changed = false;
  const result = tools.map((selection) => {
    const ids = selection.tool_ids ?? [];
    if (!ids.includes(oldId)) {
      return selection;
    }
    const existingSet = new Set(ids);
    const toAdd = supplementalIds.filter((id) => !existingSet.has(id));
    if (toAdd.length === 0) {
      return selection;
    }
    changed = true;
    return { ...selection, tool_ids: [...ids, ...toAdd] };
  });
  return changed ? result : tools;
};

/**
 * Appends supplemental tool IDs alongside an old ID in a flat string array.
 * The old ID is kept. Idempotent: returns the same reference if oldId is not
 * present or all supplemental IDs already exist.
 */
export const addToolIdsToArray = (
  toolIds: string[],
  oldId: string,
  supplementalIds: string[]
): string[] => {
  if (!toolIds.includes(oldId)) {
    return toolIds;
  }
  const existingSet = new Set(toolIds);
  const toAdd = supplementalIds.filter((id) => !existingSet.has(id));
  if (toAdd.length === 0) {
    return toolIds;
  }
  return [...toolIds, ...toAdd];
};

const getToolsFromAgentSource = (source: AgentProperties): ToolSelection[] => {
  return source.configuration?.tools ?? source.config?.tools ?? [];
};

interface BackfillHit<TDoc> {
  _id: string;
  _seq_no?: number;
  _primary_term?: number;
  _source?: TDoc;
  sort?: SortResults;
}

interface BackfillClient<TDoc> {
  search: (req: StorageClientSearchRequest) => Promise<{
    hits: { hits: Array<BackfillHit<TDoc>> };
  }>;
  bulk: (req: {
    operations: Array<{
      index: { _id: string; document: TDoc; if_seq_no?: number; if_primary_term?: number };
    }>;
    refresh: 'wait_for';
    throwOnFail: boolean;
  }) => Promise<unknown>;
}

/**
 * Paginates through all documents in a storage index via search_after and bulk-indexes
 * any that need updating. The `processHits` callback receives one page of hits and returns
 * the bulk operations to apply (empty array = nothing to update for that page).
 *
 * Sorts on `(id, space)` — the globally-unique composite key — so search_after is
 * unambiguous across spaces.
 *
 * Each bulk index op carries `if_seq_no`/`if_primary_term` from the search hit for
 * optimistic concurrency control. A version conflict (concurrent edit) throws, which
 * the outer pRetry catches and retries from scratch with fresh sequence numbers.
 */
const paginatedUpdate = async <TDoc>({
  client,
  label,
  logger,
  processHits,
}: {
  client: BackfillClient<TDoc>;
  label: string;
  logger: Logger;
  processHits: (
    hits: Array<BackfillHit<TDoc>>,
    now: Date
  ) => Array<{
    index: { _id: string; document: TDoc; if_seq_no?: number; if_primary_term?: number };
  }>;
}): Promise<void> => {
  const now = new Date();
  let totalUpdated = 0;
  let searchAfter: SortResults | undefined;

  do {
    const searchRequest: StorageClientSearchRequest = {
      track_total_hits: false,
      size: PAGE_SIZE,
      seq_no_primary_term: true,
      sort: [{ id: 'asc' }, { space: 'asc' }],
      ...(searchAfter && { search_after: searchAfter }),
    };
    const response = await client.search(searchRequest);

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    const bulkOperations = processHits(hits, now);

    if (bulkOperations.length > 0) {
      await client.bulk({
        operations: bulkOperations,
        refresh: 'wait_for',
        throwOnFail: true,
      });
      totalUpdated += bulkOperations.length;
    }

    searchAfter = hits[hits.length - 1].sort as SortResults | undefined;

    if (hits.length < PAGE_SIZE) break;
  } while (true);

  if (totalUpdated > 0) {
    logger.info(`${label} tool ID backfill: updated ${totalUpdated} document(s).`);
  }
};

/**
 * Scans all agents in .chat-agents and appends supplemental tool IDs alongside old ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
export const backfillAgentToolIds = async ({
  storage,
  logger,
}: {
  storage: AgentProfileStorage;
  logger: Logger;
}): Promise<void> => {
  await paginatedUpdate<AgentProperties>({
    client: storage.getClient() as BackfillClient<AgentProperties>,
    label: 'Agent',
    logger,
    processHits: (hits, now) => {
      const ops: Array<{
        index: {
          _id: string;
          document: AgentProperties;
          if_seq_no?: number;
          if_primary_term?: number;
        };
      }> = [];
      for (const hit of hits) {
        const source = hit._source;
        if (!source) continue;

        const currentTools = getToolsFromAgentSource(source);
        let newTools = currentTools;
        for (const { oldId, supplementalIds } of TOOL_ID_BACKFILLS) {
          newTools = addToolIdsToToolSelection(newTools, oldId, supplementalIds);
        }

        if (newTools === currentTools) continue; // reference equality — nothing changed

        ops.push({
          index: {
            _id: String(hit._id),
            document: updateRequestToEs({
              agentId: source.id ?? hit._id,
              currentProps: source,
              update: { configuration: { tools: newTools } },
              updateDate: now,
            }),
            ...(hit._seq_no !== undefined && hit._primary_term !== undefined
              ? { if_seq_no: hit._seq_no, if_primary_term: hit._primary_term }
              : {}),
          },
        });
      }
      return ops;
    },
  });
};

/**
 * Scans all skills in .kibana_ai_infra-skills and appends supplemental tool IDs alongside old ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
export const backfillSkillToolIds = async ({
  storage,
  logger,
}: {
  storage: SkillStorage;
  logger: Logger;
}): Promise<void> => {
  await paginatedUpdate<SkillProperties>({
    client: storage.getClient() as BackfillClient<SkillProperties>,
    label: 'Skill',
    logger,
    processHits: (hits, now) => {
      const ops: Array<{
        index: {
          _id: string;
          document: SkillProperties;
          if_seq_no?: number;
          if_primary_term?: number;
        };
      }> = [];
      for (const hit of hits) {
        const source = hit._source;
        if (!source) continue;

        const currentToolIds = source.tool_ids ?? [];
        let newToolIds = currentToolIds;
        for (const { oldId, supplementalIds } of TOOL_ID_BACKFILLS) {
          newToolIds = addToolIdsToArray(newToolIds, oldId, supplementalIds);
        }

        if (newToolIds === currentToolIds) continue; // reference equality — nothing changed

        ops.push({
          index: {
            _id: String(hit._id),
            document: { ...source, tool_ids: newToolIds, updated_at: now.toISOString() },
            ...(hit._seq_no !== undefined && hit._primary_term !== undefined
              ? { if_seq_no: hit._seq_no, if_primary_term: hit._primary_term }
              : {}),
          },
        });
      }
      return ops;
    },
  });
};

/**
 * Applies all registered tool ID backfills
 * to persisted agent configs and skill definitions. Idempotent — safe to run
 * on every startup. Retries transient ES failures with exponential backoff.
 */
export const runToolIdBackfill = async (
  logger: Logger,
  esClient: ElasticsearchClient
): Promise<void> => {
  if (TOOL_ID_BACKFILLS.length === 0) {
    return;
  }

  await pRetry(
    async () => {
      await backfillAgentToolIds({
        storage: createAgentStorage({ logger, esClient }),
        logger,
      });

      await backfillSkillToolIds({
        storage: createSkillStorage({ logger, esClient }),
        logger,
      });
    },
    {
      retries: 5,
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: (error) => {
        logger.warn(
          `Tool ID backfill attempt ${error.attemptNumber} failed (${error.retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );
};
