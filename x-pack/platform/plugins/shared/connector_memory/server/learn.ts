/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { LOOKUP_TOOL_ID } from '../common/constants';
import type { CrawlInput } from '../common/crawl_step';
import type { ConnectorSettings } from './settings';
import { readOf, seenIn, type SourceFile } from './sources';
import type { CrawlWorkflows } from './workflow';

const AGAIN_AFTER_MS = 15 * 60_000;
// Different listings and searches each differ, so one connector may start one such run a minute.
const LISTING_EVERY_MS = 60_000;

export interface LearnDeps {
  getConnector: (request: KibanaRequest, connectorId: string) => Promise<{ actionTypeId: string }>;
  getSpaceId: (request: KibanaRequest) => string;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  esClient: (request: KibanaRequest) => Parameters<ConnectorSettings['effective']>[0]['esClient'];
  settings: ConnectorSettings;
  /** Most files remembered by name from one listing or search. */
  sampleSize: number;
  workflows: CrawlWorkflows;
  logger: Logger;
}

/** Only an agent that can use the cache is worth reading and summarizing for. */
const agentUsesMemory = (context: AfterToolCallHookContext): boolean =>
  context.toolHandlerContext?.agentConfiguration?.tools.some(
    ({ tool_ids: toolIds }) => toolIds.includes(LOOKUP_TOOL_ID) || toolIds.includes('*')
  ) === true;

/**
 * The `afterToolCall` hook (non-blocking, so it never delays the chat turn). When an agent reads a file through a
 * connector, memory runs the same workflow a scheduled crawl does, for that file and as that user: the file itself, and
 * as far around it as the connector is set to reach.
 */
export const createLearnHook = (deps: LearnDeps) => {
  const recent = new Map<string, number>();
  const lastListing = new Map<string, number>();

  return async (context: AfterToolCallHookContext): Promise<void> => {
    if (context.toolId !== platformCoreTools.executeConnectorSubAction) {
      return;
    }
    const { connectorId, subAction, params } = context.toolParams;
    const results = context.toolReturn.results;
    if (
      typeof connectorId !== 'string' ||
      typeof subAction !== 'string' ||
      !results?.length ||
      results.some((r) => r.type === ToolResultType.error)
    ) {
      return;
    }
    const { request } = context;
    const { actionTypeId } = await deps.getConnector(request, connectorId);
    const read = readOf(
      actionTypeId,
      subAction,
      typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : {}
    );
    // Not a read: a listing or search may still have shown files worth remembering by name.
    let seen: SourceFile[] = [];
    if (read === undefined) {
      try {
        seen = seenIn(actionTypeId, subAction, (results[0] as { data?: unknown }).data)
          .filter(({ isFolder }) => !isFolder)
          .slice(0, deps.sampleSize);
      } catch (error) {
        // The spec's mapping no longer fits what the action returns: say so, once per call.
        deps.logger.warn(
          `Could not read what '${subAction}' showed for '${connectorId}': ${
            error instanceof Error ? error.message : error
          }`
        );
        return;
      }
    }
    const spaceId = deps.getSpaceId(request);
    if (
      (read === undefined && seen.length === 0) ||
      !agentUsesMemory(context) ||
      !(await deps.isContextEngineEnabled(spaceId))
    ) {
      return;
    }
    const settings = await deps.settings.effective({
      esClient: deps.esClient(request),
      spaceId,
      connectorId,
    });
    // What was only seen counts beyond direct hits.
    if (settings.learn === 'off' || (read === undefined && settings.reach === 'direct')) {
      return;
    }

    // The same file, or the same listing, again soon needs nothing: the crawl would find it unchanged.
    const what =
      read ??
      createHash('sha256')
        .update(seen.map(({ id }) => id).join('\n'))
        .digest('hex');
    const key = `${spaceId}|${connectorId}|${what}|${settings.reach}|${settings.summarizeReads}`;
    if (Date.now() - (recent.get(key) ?? 0) < AGAIN_AFTER_MS) {
      return;
    }
    if (read === undefined) {
      const listing = `${spaceId}|${connectorId}`;
      if (Date.now() - (lastListing.get(listing) ?? 0) < LISTING_EVERY_MS) {
        return;
      }
      lastListing.set(listing, Date.now());
    }
    recent.set(key, Date.now());

    const input: Partial<CrawlInput> =
      read === undefined
        ? {
            connector_id: connectorId,
            file_mode: 'names',
            entries: seen.map(({ id, name, url, mimeType, modifiedAt, size }) => ({
              id,
              name,
              url,
              mimeType,
              modifiedAt,
              size,
            })),
          }
        : {
            connector_id: connectorId,
            files: [read],
            file_mode: settings.summarizeReads ? 'full' : 'names',
            max_items: settings.area.maxFiles,
            // Siblings are the folder's own files; the area goes down a few levels as well.
            ...(settings.reach !== 'direct' && {
              around: settings.reach === 'siblings' ? 0 : settings.area.maxDepth,
            }),
          };
    await deps.workflows.runOnce({ request, spaceId, connectorId, input }).catch((error) => {
      recent.delete(key);
      deps.logger.warn(
        `Could not start memory for '${connectorId}': ${
          error instanceof Error ? error.message : error
        }`
      );
    });
  };
};
