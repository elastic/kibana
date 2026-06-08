/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ProactiveRagSession, ProactiveRagConfig, ProactiveContext } from './types';
import { createProactiveRagSession } from './proactive_rag_session';

const DEFAULT_CONFIG: ProactiveRagConfig = {
  debounceMs: 500,
  maxFindings: 3,
  minScore: 0.5,
  toolCallDelayMs: 1500,
};

interface ProactiveRagServiceDeps {
  logger: Logger;
}

interface StartSessionParams {
  conversation: Conversation;
  esClient: ElasticsearchClient;
  chatModel: InferenceChatModel;
  config?: Partial<ProactiveRagConfig>;
  onContextReady?: (context: ProactiveContext) => void;
}

/**
 * Service for managing proactive RAG sessions.
 */
export interface ProactiveRagService {
  /**
   * Start a new proactive RAG session for a conversation.
   */
  startSession(params: StartSessionParams): ProactiveRagSession;
}

/**
 * Creates the proactive RAG service.
 */
export const createProactiveRagService = ({
  logger,
}: ProactiveRagServiceDeps): ProactiveRagService => {
  logger.info(`[ProactiveRAG:Service] Creating ProactiveRagService`);

  const startSession = ({
    conversation,
    esClient,
    chatModel,
    config: configOverrides,
    onContextReady,
  }: StartSessionParams): ProactiveRagSession => {
    const config: ProactiveRagConfig = {
      ...DEFAULT_CONFIG,
      ...configOverrides,
    };

    logger.info(`[ProactiveRAG:Service] Starting session with config: ${JSON.stringify(config)}`);
    logger.info(
      `[ProactiveRAG:Service] Initial conversation has ${conversation.rounds?.length ?? 0} rounds`
    );

    const sessionLogger = logger.get('proactive-rag');

    const session = createProactiveRagSession({
      esClient,
      chatModel,
      config,
      logger: sessionLogger,
      onContextReady:
        onContextReady ??
        (() => {
          logger.info(`[ProactiveRAG:Service] onContextReady callback fired (no handler provided)`);
        }),
    });

    logger.info(`[ProactiveRAG:Service] Session created, calling initial update()`);
    session.update(conversation);

    return session;
  };

  return {
    startSession,
  };
};

/**
 * Format proactive context for injection into the conversation.
 */
export const formatProactiveContext = (context: ProactiveContext): string => {
  const findingsText = context.findings
    .map(
      (f) => `### ${f.pageTitle}
${f.relevantExcerpt}

_Relevance: ${f.relevanceReason}_`
    )
    .join('\n\n');

  return `<proactive_context>
Based on the current conversation, here is relevant background information from the knowledge base:

${findingsText}

Consider this context when responding. Reference specific details if they help answer the user's question.
</proactive_context>`;
};
