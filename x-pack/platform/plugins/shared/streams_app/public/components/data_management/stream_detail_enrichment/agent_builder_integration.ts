/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
import type { Streams } from '@kbn/streams-schema';
import { STREAMS_ATTACHMENT_TYPE_ID } from '@kbn/streams-plugin/common';

/**
 * Schema for processing step updates from the browser API tool
 */
const processorSchema = z.record(z.any()).describe('Processor configuration object');

const updateProcessingStepsSchema = z.object({
  processors: z
    .array(processorSchema)
    .describe(
      'Complete list of streamlang processors. IMPORTANT: Use streamlang format with "action" field (e.g., {"action": "grok", "from": "message", "patterns": [...]}), NOT Elasticsearch ingest pipeline format like {"grok": {...}}.'
    ),
});

/**
 * Current UI state for enrichment page
 */
export interface EnrichmentUIState {
  /**
   * Whether in interactive or YAML mode
   */
  isInteractiveMode: boolean;
  /**
   * Current processing steps (may include uncommitted changes)
   */
  currentProcessors: Array<Record<string, any>>;
  /**
   * Step currently being edited
   */
  editingStep?: {
    index: number;
    processor: Record<string, any>;
  };
  /**
   * Whether pipeline suggestion is being generated or viewed
   */
  isPipelineSuggestionActive: boolean;
  /**
   * Current simulation state
   */
  simulation?: {
    isRunning: boolean;
    hasErrors: boolean;
    detectedFields?: Array<{ name: string; type: string }>;
  };
  /**
   * Whether there are uncommitted changes
   */
  hasChanges: boolean;
}

export interface UseEnrichmentIntegrationOptions {
  /**
   * Full stream definition
   */
  definition: Streams.ingest.all.GetResponse;
  /**
   * Current UI editing state
   */
  uiState: EnrichmentUIState;
  /**
   * Callback to update all processing steps
   */
  onUpdateProcessingSteps: (processors: Array<Record<string, any>>) => void;
}

export interface UseEnrichmentIntegrationResult {
  /**
   * Browser API tools to pass to the onechat flyout
   */
  browserApiTools: Array<BrowserApiToolDefinition<any>>;
  /**
   * Attachments to pass to the onechat flyout
   */
  attachments: AttachmentInput[];
  /**
   * Opens the onechat flyout with stream enrichment context
   */
  openAgentBuilderFlyout: (onechat: OnechatPluginStart) => void;
}

/**
 * Hook to integrate with the Agent Builder / Onechat system for enrichment page.
 *
 * Provides:
 * - Browser API tools for managing processing steps
 * - Full stream attachment with current UI state for providing context to the agent
 * - Helper to open the onechat flyout with proper configuration
 */
export function useEnrichmentIntegration({
  definition,
  uiState,
  onUpdateProcessingSteps,
}: UseEnrichmentIntegrationOptions): UseEnrichmentIntegrationResult {
  // Use ref to store the latest callback to avoid recreating tool
  const updateStepsRef = useRef(onUpdateProcessingSteps);

  useEffect(() => {
    updateStepsRef.current = onUpdateProcessingSteps;
  }, [onUpdateProcessingSteps]);

  /**
   * Tool to update the entire processing pipeline
   */
  const updateProcessingStepsTool: BrowserApiToolDefinition<
    z.infer<typeof updateProcessingStepsSchema>
  > = useMemo(
    () => ({
      id: 'streams_update_processing_steps',
      description: `Replaces the entire processing pipeline with a new set of streamlang processors.

CRITICAL WORKFLOW - MUST FOLLOW THIS ORDER:
1. If you need log parsing (grok/dissect patterns):
   - Call streams.suggest_grok_pattern OR streams.suggest_dissect_pattern FIRST
   - DO NOT write grok/dissect patterns manually - they're too complex
   - Use the returned processor in your pipeline
2. Build or generate the complete pipeline:
   - Option A: Call streams.suggest_pipeline (pass parsingProcessor if you have one)
   - Option B: Build manually with streams.get_streamlang_docs
3. ALWAYS call streams.simulate_pipeline to test the pipeline
4. If simulation succeeds (no errors) → THEN call this tool to apply changes
5. If simulation fails (has errors) → DO NOT call this tool. Instead:
   - Analyze the error messages from the simulation
   - For grok/dissect errors: call the pattern generation tool again with better guidance
   - For other errors: use streams.get_streamlang_docs to understand processor schemas
   - Fix the pipeline based on the errors
   - Call streams.simulate_pipeline again to test the fix
   - Repeat until simulation succeeds
   - Only then call this tool to apply the working pipeline

NEVER apply a pipeline without successful simulation first. This prevents breaking the user's data processing.

This tool expects streamlang format processors with "action" field:
- Correct: {"action": "grok", "from": "message", "patterns": [...]}
- Wrong: {"grok": {...}} (Elasticsearch ingest format - DO NOT use)

For generating new pipelines:
- Option 1: Call streams.suggest_pipeline tool (AI-powered, includes automatic simulation)
- Option 2: Manual construction:
  1. Call streams.get_streamlang_docs to see processor schemas
  2. Build pipeline based on schemas
  3. Call streams.simulate_pipeline to test it
  4. Fix any errors and simulate again
  5. Once successful, call this tool to apply

The user will preview changes before final commit.`,
      schema: updateProcessingStepsSchema,
      handler: async ({ processors }) => {
        updateStepsRef.current(processors);
      },
    }),
    []
  );

  const browserApiTools = useMemo(() => [updateProcessingStepsTool], [updateProcessingStepsTool]);

  /**
   * Attachment providing comprehensive context about the current stream
   * and UI state to the agent
   */
  const attachments: AttachmentInput[] = useMemo(() => {
    // Build comprehensive context including current UI state
    const contextData: Record<string, any> = {
      streamName: definition.stream.name,
      streamDefinition: definition,
      currentUIState: {
        mode: uiState.isInteractiveMode ? 'interactive' : 'yaml',
        currentProcessors: uiState.currentProcessors,
        editingStep: uiState.editingStep,
        pipelineSuggestion: {
          active: uiState.isPipelineSuggestionActive,
        },
        simulation: uiState.simulation,
        hasChanges: uiState.hasChanges,
      },
    };

    return [
      {
        type: STREAMS_ATTACHMENT_TYPE_ID,
        data: contextData,
      },
    ];
  }, [definition, uiState]);

  /**
   * Opens the onechat flyout with stream enrichment context and browser tools configured
   */
  const openAgentBuilderFlyout = useCallback(
    (onechat: OnechatPluginStart) => {
      onechat.openConversationFlyout({
        attachments,
        browserApiTools,
        sessionTag: `streams-enrichment-${definition.stream.name}`,
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
