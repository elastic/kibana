/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  ProactiveRagSession,
  ProactiveContext,
  ProactiveRagConfig,
  OnContextReadyFn,
} from './types';
import { extractContext, extractContextFromActions } from './context_extractor';
import { searchMemory } from './memory_search_agent';
import type { ExtractedContext } from './types';

interface CreateSessionParams {
  esClient: ElasticsearchClient;
  chatModel: InferenceChatModel;
  config: ProactiveRagConfig;
  logger: Logger;
  onContextReady: OnContextReadyFn;
}

/**
 * Creates a proactive RAG session that monitors conversation updates
 * and searches memory in the background with debouncing.
 */
export const createProactiveRagSession = ({
  esClient,
  chatModel,
  config,
  logger,
  onContextReady,
}: CreateSessionParams): ProactiveRagSession => {
  let debounceTimer: NodeJS.Timeout | null = null;
  let lastContextHash: string | null = null;
  let readyContext: ProactiveContext | undefined;
  let isSearching = false;
  let isStopped = false;
  const injectedIds = new Set<string>();

  logger.info(
    `[ProactiveRAG] Session created with config: debounceMs=${config.debounceMs}, maxFindings=${config.maxFindings}`
  );

  const performSearch = async (context: ExtractedContext) => {
    logger.info(
      `[ProactiveRAG] performSearch called - isStopped=${isStopped}, isSearching=${isSearching}`
    );

    if (isStopped || isSearching) {
      logger.info(
        `[ProactiveRAG] performSearch skipped - isStopped=${isStopped}, isSearching=${isSearching}`
      );
      return;
    }

    if (context.hash === lastContextHash) {
      logger.info(
        `[ProactiveRAG] performSearch skipped - context unchanged (hash=${context.hash})`
      );
      return;
    }

    logger.info(`[ProactiveRAG] performSearch starting search - hash=${context.hash}`);
    logger.info(`[ProactiveRAG] Context topics: [${context.topics.join(', ')}]`);
    logger.info(`[ProactiveRAG] Context entities: [${context.entities.join(', ')}]`);
    logger.info(`[ProactiveRAG] Context intent: ${context.userIntent}`);

    lastContextHash = context.hash;
    isSearching = true;

    try {
      logger.info(`[ProactiveRAG] Calling searchMemory...`);

      const result = await searchMemory({
        context,
        esClient,
        chatModel,
        config,
        logger,
      });

      logger.info(
        `[ProactiveRAG] searchMemory returned - findings=${result.findings.length}, query="${result.searchQuery}"`
      );

      if (isStopped) {
        logger.info(`[ProactiveRAG] Session stopped during search, discarding results`);
        return;
      }

      if (result.findings.length > 0) {
        readyContext = {
          id: uuidV4(),
          searchQuery: result.searchQuery,
          findings: result.findings,
          generatedAt: new Date().toISOString(),
        };

        logger.info(
          `[ProactiveRAG] Context READY - id=${readyContext.id}, findings=${result.findings.length}`
        );
        result.findings.forEach((f, i) => {
          logger.info(`[ProactiveRAG]   Finding ${i + 1}: "${f.pageTitle}" (score=${f.score})`);
        });

        onContextReady(readyContext);
      } else {
        logger.info(`[ProactiveRAG] No relevant pages found for query "${result.searchQuery}"`);
      }
    } catch (error) {
      logger.error(`[ProactiveRAG] Search error: ${error}`);
    } finally {
      isSearching = false;
    }
  };

  const scheduleSearch = (context: ExtractedContext) => {
    logger.info(
      `[ProactiveRAG] scheduleSearch called - isStopped=${isStopped}, debounceMs=${config.debounceMs}`
    );

    if (isStopped) {
      logger.info(`[ProactiveRAG] scheduleSearch skipped - session stopped`);
      return;
    }

    if (debounceTimer) {
      logger.info(`[ProactiveRAG] Clearing previous debounce timer`);
      clearTimeout(debounceTimer);
    }

    logger.info(`[ProactiveRAG] Scheduling search in ${config.debounceMs}ms...`);

    debounceTimer = setTimeout(() => {
      logger.info(`[ProactiveRAG] Debounce timer fired - executing search`);
      performSearch(context).catch((error) => {
        logger.error(`[ProactiveRAG] Async search error: ${error}`);
      });
    }, config.debounceMs);
  };

  const update = (conversation: Conversation) => {
    logger.info(`[ProactiveRAG] update() called - rounds=${conversation.rounds?.length ?? 0}`);

    const context = extractContext(conversation);
    logger.info(
      `[ProactiveRAG] Extracted context from conversation - hash=${context.hash}, topics=${context.topics.length}`
    );

    scheduleSearch(context);
  };

  const updateWithActions = (conversation: Conversation, actionResults: string[]) => {
    logger.info(
      `[ProactiveRAG] updateWithActions() called - actionResults=${actionResults.length}`
    );

    if (actionResults.length === 0) {
      logger.info(`[ProactiveRAG] No action results, falling back to update()`);
      return update(conversation);
    }

    const previewLength = Math.min(500, actionResults[0]?.length ?? 0);
    logger.info(
      `[ProactiveRAG] Action result[0] preview: ${actionResults[0]?.substring(0, previewLength)}...`
    );

    const context = extractContextFromActions(conversation, actionResults);
    logger.info(
      `[ProactiveRAG] Extracted context from actions - hash=${
        context.hash
      }, topics=[${context.topics.join(', ')}]`
    );

    scheduleSearch(context);
  };

  const getReadyContext = (): ProactiveContext | undefined => {
    logger.info(`[ProactiveRAG] getReadyContext() called - hasContext=${!!readyContext}`);
    return readyContext;
  };

  const wasInjected = (contextId: string): boolean => {
    const result = injectedIds.has(contextId);
    logger.info(`[ProactiveRAG] wasInjected(${contextId}) = ${result}`);
    return result;
  };

  const markInjected = (contextId: string): void => {
    logger.info(`[ProactiveRAG] markInjected(${contextId})`);
    injectedIds.add(contextId);
  };

  const stop = () => {
    logger.info(`[ProactiveRAG] stop() called`);
    isStopped = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const getConfig = (): ProactiveRagConfig => {
    return config;
  };

  return {
    update,
    updateWithActions,
    getReadyContext,
    wasInjected,
    markInjected,
    getConfig,
    stop,
  };
};
