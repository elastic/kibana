/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ToolSelection } from '@kbn/agent-builder-common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { StorageClientSearchRequest } from '@kbn/storage-adapter';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import { createStorage as createAgentStorage } from './client/storage';
import type { SkillStorage, SkillProperties } from '../../skills/persisted/client/storage';
import { createStorage as createSkillStorage } from '../../skills/persisted/client/storage';
import { updateRequestToEs } from './client/converters';

const PAGE_SIZE = 1000;

export interface ToolIdMigrationEntry {
  oldId: string;
  newIds: string[];
}

/**
 * Registry of tool ID migrations. Add new entries here when tool IDs are
 * renamed or split. Each entry maps an old ID to one or more replacement IDs.
 * The migration runner applies all entries idempotently on every startup.
 */
const TOOL_ID_MIGRATIONS: ToolIdMigrationEntry[] = [
  {
    oldId: 'platform.core.cases.attachments',
    newIds: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
  },
];

/**
 * Replaces an old tool ID with one or more new IDs in a ToolSelection array.
 * Idempotent: if any new IDs already exist, they are not duplicated.
 */
export const replaceToolIdsInToolSelection = (
  tools: ToolSelection[],
  oldId: string,
  newIds: string[]
): ToolSelection[] => {
  return tools.map((selection) => {
    const ids = selection.tool_ids ?? [];
    if (!ids.includes(oldId)) {
      return selection;
    }
    const withoutOld = ids.filter((id) => id !== oldId);
    const existingSet = new Set(withoutOld);
    const toAdd = newIds.filter((id) => !existingSet.has(id));
    return { ...selection, tool_ids: [...withoutOld, ...toAdd] };
  });
};

/**
 * Replaces an old tool ID with one or more new IDs in a flat string array.
 * Idempotent: if any new IDs already exist, they are not duplicated.
 * Returns the same reference if oldId is not present.
 */
export const replaceToolIdsInArray = (
  toolIds: string[],
  oldId: string,
  newIds: string[]
): string[] => {
  if (!toolIds.includes(oldId)) {
    return toolIds;
  }
  const withoutOld = toolIds.filter((id) => id !== oldId);
  const existingSet = new Set(withoutOld);
  const toAdd = newIds.filter((id) => !existingSet.has(id));
  return [...withoutOld, ...toAdd];
};

const getToolsFromAgentSource = (source: AgentProperties): ToolSelection[] => {
  return source.configuration?.tools ?? source.config?.tools ?? [];
};

interface MigrationClient<TDoc> {
  search: (req: StorageClientSearchRequest) => Promise<{
    hits: { hits: Array<{ _id: string; _source?: TDoc; sort?: SortResults }> };
  }>;
  bulk: (req: {
    operations: Array<{ index: { _id: string; document: TDoc } }>;
    refresh: 'wait_for';
    throwOnFail: boolean;
  }) => Promise<unknown>;
}

/**
 * Paginates through all documents in a storage index via search_after and bulk-indexes
 * any that need updating. The `processHits` callback receives one page of hits and returns
 * the bulk operations to apply (empty array = nothing to update for that page).
 */
const paginatedMigration = async <TDoc>({
  client,
  label,
  logger,
  processHits,
}: {
  client: MigrationClient<TDoc>;
  label: string;
  logger: Logger;
  processHits: (
    hits: Array<{ _id: string; _source?: TDoc }>,
    now: Date
  ) => Array<{ index: { _id: string; document: TDoc } }>;
}): Promise<void> => {
  const now = new Date();
  let totalUpdated = 0;
  let searchAfter: SortResults | undefined;

  do {
    const searchRequest: StorageClientSearchRequest = {
      track_total_hits: false,
      size: PAGE_SIZE,
      sort: [{ _id: 'asc' }],
      ...(searchAfter && { search_after: searchAfter }),
    };
    const response = await client.search(searchRequest);

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    const bulkOperations = processHits(hits, now);

    if (bulkOperations.length > 0) {
      try {
        await client.bulk({
          operations: bulkOperations,
          refresh: 'wait_for',
          throwOnFail: true,
        });
        totalUpdated += bulkOperations.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`${label} tool ID migration: bulk update failed. ${message}`);
      }
    }

    searchAfter = hits[hits.length - 1].sort as SortResults | undefined;

    if (hits.length < PAGE_SIZE) break;
  } while (true);

  if (totalUpdated > 0) {
    logger.info(`${label} tool ID migration: updated ${totalUpdated} document(s).`);
  }
};

/**
 * Scans all agents in .chat-agents and replaces old tool IDs with new ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
export const migrateAgentToolIds = async ({
  storage,
  logger,
}: {
  storage: AgentProfileStorage;
  logger: Logger;
}): Promise<void> => {
  const oldIdSet = new Set(TOOL_ID_MIGRATIONS.map((m) => m.oldId));

  await paginatedMigration<AgentProperties>({
    client: storage.getClient() as MigrationClient<AgentProperties>,
    label: 'Agent',
    logger,
    processHits: (hits, now) => {
      const ops: Array<{ index: { _id: string; document: AgentProperties } }> = [];
      for (const hit of hits) {
        const source = hit._source;
        if (!source) continue;

        const currentTools = getToolsFromAgentSource(source);
        if (!currentTools.some((sel) => (sel.tool_ids ?? []).some((id) => oldIdSet.has(id)))) {
          continue;
        }

        let newTools = currentTools;
        for (const { oldId, newIds } of TOOL_ID_MIGRATIONS) {
          newTools = replaceToolIdsInToolSelection(newTools, oldId, newIds);
        }

        ops.push({
          index: {
            _id: String(hit._id),
            document: updateRequestToEs({
              agentId: source.id ?? hit._id,
              currentProps: source,
              update: { configuration: { tools: newTools } },
              updateDate: now,
            }),
          },
        });
      }
      return ops;
    },
  });
};

/**
 * Scans all skills in .kibana_ai_infra-skills and replaces old tool IDs with new ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
export const migrateSkillToolIds = async ({
  storage,
  logger,
}: {
  storage: SkillStorage;
  logger: Logger;
}): Promise<void> => {
  const oldIdSet = new Set(TOOL_ID_MIGRATIONS.map((m) => m.oldId));

  await paginatedMigration<SkillProperties>({
    client: storage.getClient() as MigrationClient<SkillProperties>,
    label: 'Skill',
    logger,
    processHits: (hits, now) => {
      const ops: Array<{ index: { _id: string; document: SkillProperties } }> = [];
      for (const hit of hits) {
        const source = hit._source;
        if (!source) continue;

        const currentToolIds = source.tool_ids ?? [];
        if (!currentToolIds.some((id) => oldIdSet.has(id))) continue;

        let newToolIds = currentToolIds;
        for (const { oldId, newIds } of TOOL_ID_MIGRATIONS) {
          newToolIds = replaceToolIdsInArray(newToolIds, oldId, newIds);
        }

        ops.push({
          index: {
            _id: String(hit._id),
            document: { ...source, tool_ids: newToolIds, updated_at: now.toISOString() },
          },
        });
      }
      return ops;
    },
  });
};

/**
 * Applies all registered tool ID migrations
 * to persisted agent configs and skill definitions. Idempotent — safe to run
 * on every startup.
 */
export const runToolIdMigrations = async (
  logger: Logger,
  esClient: ElasticsearchClient
): Promise<void> => {
  await migrateAgentToolIds({
    storage: createAgentStorage({ logger, esClient }),
    logger,
  });

  await migrateSkillToolIds({
    storage: createSkillStorage({ logger, esClient }),
    logger,
  });
};
