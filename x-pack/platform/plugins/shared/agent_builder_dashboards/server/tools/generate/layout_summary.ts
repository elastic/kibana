/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FileEntryType, type ToolResultStore } from '@kbn/agent-builder-server/runner';
import { dashboardTools } from '../../../common';

const generateDashboardCallSchema = z.object({
  tool_id: z.literal(dashboardTools.generateDashboard),
  results: z.array(z.object({ tool_result_id: z.string() })),
});

const dashboardResultDataSchema = z.object({
  attachment_id: z.string(),
  layout_summary: z.string().optional(),
});

const getGenerateDashboardResultIds = async (
  resultStore: ToolResultStore,
  toolCallDirPath: string
): Promise<string[]> => {
  const entries = await resultStore.listEntries(toolCallDirPath);
  return entries.flatMap((entry) => {
    if (entry.type !== 'file' || entry.metadata.type !== FileEntryType.toolCallMeta) {
      return [];
    }
    const toolCall = generateDashboardCallSchema.safeParse(entry.content.raw);
    return toolCall.success ? toolCall.data.results.map(({ tool_result_id: id }) => id) : [];
  });
};

/**
 * Summary of the user's layout requests from the latest `generate_dashboard` result for the
 * attachment. The store lists tool calls in the order they were made.
 */
export const findLayoutSummary = async (
  resultStore: ToolResultStore,
  attachmentId: string
): Promise<string | undefined> => {
  const toolCallDirs = await resultStore.listEntries('/');
  const resultIds = (
    await Promise.all(
      toolCallDirs.map(({ path }) => getGenerateDashboardResultIds(resultStore, path))
    )
  ).flat();
  const summaries = resultIds.flatMap((resultId) => {
    const result = dashboardResultDataSchema.safeParse(resultStore.get(resultId).data);
    return result.success && result.data.attachment_id === attachmentId
      ? [result.data.layout_summary]
      : [];
  });
  return summaries.at(-1);
};
