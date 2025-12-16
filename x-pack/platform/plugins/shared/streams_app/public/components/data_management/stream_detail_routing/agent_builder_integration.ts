/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { Condition } from '@kbn/streamlang';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { Streams } from '@kbn/streams-schema';
import { STREAMS_ATTACHMENT_TYPE_ID } from '@kbn/streams-plugin/common';

/**
 * Schema for partition suggestions from the browser API tool
 */
const partitionSchema = z.object({
  name: z.string().describe('Name of the suggested partition'),
  condition: z.record(z.any()).describe('Routing condition for the partition'),
});

const setPartitionSuggestionsSchema = z.object({
  partitions: z
    .array(partitionSchema)
    .describe('List of suggested partitions to display for review'),
});

export type PartitionSuggestionFromTool = z.infer<typeof partitionSchema>;

/**
 * Current UI state for routing page
 */
export interface RoutingUIState {
  /**
   * Currently editing rule ID
   */
  currentRuleId?: string;
  /**
   * Form values for rule being edited
   */
  editingForm?: {
    name: string;
    condition: Condition;
  };
  /**
   * Current routing rules
   */
  routing: Array<{
    name: string;
    condition: Condition;
  }>;
  /**
   * Whether user is reordering rules
   */
  isReordering: boolean;
  /**
   * Current suggestions being reviewed
   */
  suggestions?: Array<{
    name: string;
    condition: Condition;
  }>;
}

export interface UseAgentBuilderIntegrationOptions {
  /**
   * Full stream definition
   */
  definition: Streams.ingest.all.GetResponse;
  /**
   * Current UI editing state
   */
  uiState: RoutingUIState;
  /**
   * Callback to set partition suggestions in the UI
   */
  onSetPartitionSuggestions: (partitions: Array<{ name: string; condition: Condition }>) => void;
}

export interface UseAgentBuilderIntegrationResult {
  /**
   * Browser API tools to pass to the onechat flyout
   */
  browserApiTools: Array<BrowserApiToolDefinition<any>>;
  /**
   * Attachments to pass to the onechat flyout
   */
  attachments: AttachmentInput[];
  /**
   * Opens the onechat flyout with stream context
   */
  openAgentBuilderFlyout: (onechat: OnechatPluginStart) => void;
}

/**
 * Hook to integrate with the Agent Builder / Onechat system for routing page.
 *
 * Provides:
 * - Browser API tool for setting partition suggestions from the agent
 * - Full stream attachment with current UI state for providing context to the agent
 * - Helper to open the onechat flyout with proper configuration
 */
export function useAgentBuilderIntegration({
  definition,
  uiState,
  onSetPartitionSuggestions,
}: UseAgentBuilderIntegrationOptions): UseAgentBuilderIntegrationResult {
  // Use a ref to store the latest callback to avoid recreating the tool
  const callbackRef = useRef(onSetPartitionSuggestions);
  useEffect(() => {
    callbackRef.current = onSetPartitionSuggestions;
  }, [onSetPartitionSuggestions]);

  /**
   * Browser API tool that allows the agent to set partition suggestions in the UI.
   * When the agent calls this tool, the suggestions will be displayed in the
   * partitioning UI for the user to review and accept/reject.
   */
  const setPartitionSuggestionsTool: BrowserApiToolDefinition<
    z.infer<typeof setPartitionSuggestionsSchema>
  > = useMemo(
    () => ({
      id: 'streams_set_partition_suggestions',
      description: `Sets the partition suggestions in the Streams partitioning UI for user review. 
Call this tool after generating partition suggestions using the streams.suggest_partitions tool.
The suggestions will be displayed to the user who can then preview, accept, or reject each one.
Each partition should have a name and a routing condition.`,
      schema: setPartitionSuggestionsSchema,
      handler: async ({ partitions }) => {
        // Convert the partitions to the expected format
        const formattedPartitions = partitions.map((p) => ({
          name: p.name,
          condition: p.condition as Condition,
        }));

        // Set the suggestions in the UI
        callbackRef.current(formattedPartitions);
      },
    }),
    []
  );

  const browserApiTools = useMemo(
    () => [setPartitionSuggestionsTool],
    [setPartitionSuggestionsTool]
  );

  /**
   * Stream attachment that provides comprehensive context about the current stream
   * and UI state to the agent
   */
  const attachments: AttachmentInput[] = useMemo(() => {
    // Build comprehensive context including current UI state
    const contextData: Record<string, any> = {
      streamName: definition.stream.name,
      streamDefinition: definition.stream,
      currentUIState: {
        editingRule: uiState.currentRuleId
          ? {
              ruleId: uiState.currentRuleId,
              form: uiState.editingForm,
            }
          : undefined,
        existingRules: uiState.routing.map((rule) => ({
          name: rule.name,
          condition: rule.condition,
        })),
        isReordering: uiState.isReordering,
        pendingSuggestions: uiState.suggestions,
      },
    };

    return [
      {
        type: STREAMS_ATTACHMENT_TYPE_ID,
        data: contextData,
        hidden: true, // Context-only, not shown in the chat UI
      },
    ];
  }, [definition, uiState]);

  /**
   * Opens the onechat flyout with stream context and browser tools configured
   */
  const openAgentBuilderFlyout = useCallback(
    (onechat: OnechatPluginStart) => {
      onechat.openConversationFlyout({
        attachments,
        browserApiTools,
        sessionTag: `streams-partitioning-${definition.stream.name}`,
        newConversation: false,
      });
    },
    [attachments, browserApiTools, definition.stream.name]
  );

  return {
    browserApiTools,
    attachments,
    openAgentBuilderFlyout,
  };
}

/**
 * Creates the configuration for opening the onechat flyout in the context
 * of stream partitioning.
 */
export function createOnechatFlyoutConfig({
  definition,
  uiState,
  browserApiTools,
}: {
  definition: Streams.ingest.all.GetResponse;
  uiState: RoutingUIState;
  browserApiTools: Array<BrowserApiToolDefinition<any>>;
}) {
  const contextData: Record<string, any> = {
    streamName: definition.stream.name,
    streamDefinition: definition.stream,
    currentUIState: {
      editingRule: uiState.currentRuleId
        ? {
            ruleId: uiState.currentRuleId,
            form: uiState.editingForm,
          }
        : undefined,
      existingRules: uiState.routing.map((rule) => ({
        name: rule.name,
        condition: rule.condition,
      })),
      isReordering: uiState.isReordering,
      pendingSuggestions: uiState.suggestions,
    },
  };

  return {
    attachments: [
      {
        type: STREAMS_ATTACHMENT_TYPE_ID,
        data: contextData,
        hidden: true,
      },
    ] as AttachmentInput[],
    browserApiTools,
    sessionTag: `streams-partitioning-${definition.stream.name}`,
  };
}
