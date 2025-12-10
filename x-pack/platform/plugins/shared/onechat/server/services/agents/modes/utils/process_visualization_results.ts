/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { map } from 'rxjs';
import type { ChatAgentEvent, ToolResultEvent } from '@kbn/onechat-common';
import { isToolResultEvent, platformCoreTools } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import type { AttachmentStateManager } from '@kbn/onechat-server/attachments';

/**
 * Processes create_visualization tool results to automatically create attachments.
 * This converts visualization results into conversation-level attachments and
 * replaces the tool result data with a reference to the attachment.
 *
 * The original visualization data is stored in the attachment, and the tool result
 * is replaced with a minimal reference that will be cleaned from history.
 */
export const processVisualizationResults = (
  attachmentManager: AttachmentStateManager
): OperatorFunction<ChatAgentEvent, ChatAgentEvent> => {
  return (events$) => {
    return events$.pipe(
      map((event) => {
        // Only process tool result events from create_visualization
        if (!isToolResultEvent(event)) {
          return event;
        }

        const { tool_id, results } = event.data;

        // Only process create_visualization tool results
        if (tool_id !== platformCoreTools.createVisualization) {
          return event;
        }

        // Process each visualization result and create attachments
        const processedResults = results.map((result) => {
          // Only process visualization type results
          if (result.type !== ToolResultType.visualization) {
            return result;
          }

          const vizData = result.data as {
            query?: string;
            visualization?: unknown;
            chart_type?: string;
            esql?: string;
          };

          // Skip if visualization data is missing
          if (!vizData.visualization) {
            return result;
          }

          // Create an attachment for the visualization
          const attachment = attachmentManager.add({
            type: AttachmentType.visualization,
            data: {
              visualization: vizData.visualization,
              chart_type: vizData.chart_type,
              esql: vizData.esql,
              description: vizData.esql || vizData.query,
            },
            description: vizData.esql || vizData.query || 'Visualization',
          });

          // Augment the result with attachment reference while preserving original data.
          // The original visualization data is kept for UI rendering in the current round.
          // The __attachment_operation__ marker enables tracking which attachments are referenced.
          return {
            ...result,
            data: {
              ...vizData,
              __attachment_operation__: 'create_visualization',
              attachment_id: attachment.id,
            },
          };
        });

        // Return modified event with processed results
        return {
          ...event,
          data: {
            ...event.data,
            results: processedResults,
          },
        } as ToolResultEvent;
      })
    );
  };
};
