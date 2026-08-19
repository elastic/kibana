/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolSelection } from '@kbn/agent-builder-common';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import type { SkillStorage, SkillProperties } from '../../skills/persisted/client/storage';
import { updateRequestToEs } from './client/converters';

const SEARCH_SIZE = 1000;

export interface ToolIdMigrationEntry {
  oldId: string;
  newIds: string[];
}

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

/**
 * Scans all agents in .chat-agents and replaces old tool IDs with new ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
export const migrateAgentToolIds = async ({
  storage,
  migrations,
  logger,
}: {
  storage: AgentProfileStorage;
  migrations: ToolIdMigrationEntry[];
  logger: Logger;
}): Promise<void> => {
  if (migrations.length === 0) {
    return;
  }

  const oldIdSet = new Set(migrations.map((m) => m.oldId));

  const response = await storage.getClient().search({
    track_total_hits: false,
    size: SEARCH_SIZE,
  });

  const hits = response.hits.hits;
  if (hits.length >= SEARCH_SIZE) {
    logger.warn(
      `Agent tool ID migration: search limit reached (size=${SEARCH_SIZE}). Some agents may not be migrated.`
    );
  }

  const bulkOperations: Array<{ index: { _id: string; document: AgentProperties } }> = [];
  const now = new Date();

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentTools = getToolsFromAgentSource(source);
    const hasOldIds = currentTools.some((sel) =>
      (sel.tool_ids ?? []).some((id) => oldIdSet.has(id))
    );
    if (!hasOldIds) continue;

    let newTools = currentTools;
    for (const { oldId, newIds } of migrations) {
      newTools = replaceToolIdsInToolSelection(newTools, oldId, newIds);
    }

    const updated = updateRequestToEs({
      agentId: source.id ?? hit._id,
      currentProps: source,
      update: { configuration: { tools: newTools } },
      updateDate: now,
    });
    bulkOperations.push({
      index: { _id: String(hit._id), document: updated },
    });
  }

  if (bulkOperations.length === 0) {
    return;
  }

  try {
    await storage.getClient().bulk({
      operations: bulkOperations,
      refresh: 'wait_for',
      throwOnFail: true,
    });
    logger.info(`Agent tool ID migration: updated ${bulkOperations.length} agent(s).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Agent tool ID migration: bulk update failed. ${message}`);
  }
};

/**
 * Scans all skills in .kibana_ai_infra-skills and replaces old tool IDs with new ones.
 * Operates across all spaces (no space filter). Fire-and-forget safe.
 */
/**
 * Registry of tool ID migrations. Add new entries here when tool IDs are
 * renamed or split. Each entry maps an old ID to one or more replacement IDs.
 * The migration runner applies all entries idempotently on every startup.
 */
export const TOOL_ID_MIGRATIONS: ToolIdMigrationEntry[] = [
  {
    oldId: 'platform.core.cases.attachments',
    newIds: ['platform.core.cases.get_attachments', 'platform.core.cases.manage_attachments'],
  },
];

export const migrateSkillToolIds = async ({
  storage,
  migrations,
  logger,
}: {
  storage: SkillStorage;
  migrations: ToolIdMigrationEntry[];
  logger: Logger;
}): Promise<void> => {
  if (migrations.length === 0) {
    return;
  }

  const oldIdSet = new Set(migrations.map((m) => m.oldId));

  const response = await storage.getClient().search({
    track_total_hits: false,
    size: SEARCH_SIZE,
  });

  const hits = response.hits.hits;
  if (hits.length >= SEARCH_SIZE) {
    logger.warn(
      `Skill tool ID migration: search limit reached (size=${SEARCH_SIZE}). Some skills may not be migrated.`
    );
  }

  const bulkOperations: Array<{ index: { _id: string; document: SkillProperties } }> = [];
  const now = new Date();

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentToolIds = source.tool_ids ?? [];
    const hasOldIds = currentToolIds.some((id) => oldIdSet.has(id));
    if (!hasOldIds) continue;

    let newToolIds = currentToolIds;
    for (const { oldId, newIds } of migrations) {
      newToolIds = replaceToolIdsInArray(newToolIds, oldId, newIds);
    }

    const updated: SkillProperties = {
      ...source,
      tool_ids: newToolIds,
      updated_at: now.toISOString(),
    };
    bulkOperations.push({
      index: { _id: String(hit._id), document: updated },
    });
  }

  if (bulkOperations.length === 0) {
    return;
  }

  try {
    await storage.getClient().bulk({
      operations: bulkOperations,
      refresh: 'wait_for',
      throwOnFail: true,
    });
    logger.info(`Skill tool ID migration: updated ${bulkOperations.length} skill(s).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Skill tool ID migration: bulk update failed. ${message}`);
  }
};
