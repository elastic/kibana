/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { Streams } from '@kbn/streams-schema';
import { STREAMS_ATTACHMENT_TYPE_ID } from '@kbn/streams-plugin/common';

export interface UseStreamsContextOptions {
  /**
   * Full stream definition (optional - if not provided, only basic context is set)
   */
  definition?: Streams.ingest.all.GetResponse | Streams.all.GetResponse;
  /**
   * Stream name (required if definition is not provided)
   */
  streamName?: string;
  /**
   * Current page context
   */
  pageContext: 'routing' | 'enrichment' | 'lifecycle' | 'schema' | 'overview' | 'management';
  /**
   * Optional page-specific UI state
   */
  pageState?: Record<string, any>;
  /**
   * Whether AI features are enabled
   */
  aiEnabled: boolean;
  /**
   * Onechat plugin instance
   */
  onechat?: OnechatPluginStart;
}

/**
 * Hook to provide basic streams context to onechat across all pages in the streams app.
 *
 * This should be used on pages that don't have specific agent builder integrations
 * but still want to provide stream context to the agent.
 *
 * Usage:
 * ```tsx
 * const { attachments } = useStreamsContext({
 *   definition,
 *   pageContext: 'lifecycle',
 *   aiEnabled: aiFeatures?.enabled ?? false,
 *   onechat,
 * });
 * ```
 */
export function useStreamsContext({
  definition,
  streamName,
  pageContext,
  pageState,
  aiEnabled,
  onechat,
}: UseStreamsContextOptions) {
  /**
   * Stream attachment providing context about the current stream
   */
  const attachments: AttachmentInput[] = useMemo(() => {
    if (!aiEnabled) {
      return [];
    }

    const name = definition ? definition.stream.name : streamName;
    if (!name) {
      return [];
    }

    // Build context data
    const contextData: Record<string, any> = {
      streamName: name,
      pageContext,
    };

    // Include full definition if available
    if (definition) {
      contextData.streamDefinition = definition.stream;

      // Add ingest-specific metadata if available
      if ('privileges' in definition) {
        contextData.privileges = definition.privileges;
      }
    }

    // Include page-specific state if provided
    if (pageState) {
      contextData.currentUIState = pageState;
    }

    return [
      {
        type: STREAMS_ATTACHMENT_TYPE_ID,
        data: contextData,
        hidden: true, // Context-only, not shown in the chat UI
      },
    ];
  }, [definition, streamName, pageContext, pageState, aiEnabled]);

  /**
   * Configure the onechat flyout with stream context when the component mounts
   */
  useEffect(() => {
    if (onechat && aiEnabled && attachments.length > 0) {
      const name = definition ? definition.stream.name : streamName;

      onechat.setConversationFlyoutActiveConfig({
        attachments,
        browserApiTools: [], // No specific tools for generic pages
        sessionTag: `streams-${pageContext}-${name}`,
        newConversation: false,
      });

      return () => {
        onechat.clearConversationFlyoutActiveConfig();
      };
    }
  }, [onechat, attachments, pageContext, definition, streamName, aiEnabled]);

  return {
    attachments,
  };
}
