/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { extractTextContent } from '@kbn/agent-builder-genai-utils/langchain';

import { DASHBOARD_EVENTS, type DashboardSessionCreatedData } from '../../../../../common';
import { createPlanVisualizationsPrompt, createMarkdownSummaryPrompt } from './prompts';
import type { BuildDashboardState } from '../state';
import type { PlanVisualizationsAction } from '../../types';

const plannedPanelsSchema = z.object({
  panels: z
    .array(
      z.object({
        description: z
          .string()
          .describe(
            'Detailed natural language description of what the visualization shows, including the index and specific fields to use'
          ),
        title: z.string().optional().describe('A short, descriptive title for the panel'),
      })
    )
    .describe('Array of planned visualization panels'),
});

export interface PlanVisualizationsNodeDeps {
  model: ScopedModel;
  logger: Logger;
  events: ToolEventEmitter;
}

export function createPlanVisualizationsNode({
  model,
  logger,
  events,
}: PlanVisualizationsNodeDeps) {
  return async (state: BuildDashboardState) => {
    let action: PlanVisualizationsAction;
    try {
      const prompt = createPlanVisualizationsPrompt({
        query: state.query,
        title: state.title,
        description: state.description,
        index: state.discoveredIndex,
        fields: state.indexFields,
      });

      const structuredModel = model.chatModel.withStructuredOutput(plannedPanelsSchema, {
        name: 'plan_visualizations',
      });

      const response = await structuredModel.invoke(prompt);

      const plannedPanels = response.panels.map((panel) => ({
        description: String(panel.description || ''),
        title: panel.title ? String(panel.title) : undefined,
      }));

      if (plannedPanels.length === 0) {
        throw new Error('No panels were planned');
      }

      logger.debug(`Planned ${plannedPanels.length} visualizations`);

      const markdownPrompt = createMarkdownSummaryPrompt({
        title: state.title,
        description: state.description,
        query: state.query,
        plannedPanels,
      });
      const markdownResponse = await model.chatModel.invoke(markdownPrompt);
      const markdownContent = extractTextContent(markdownResponse);

      events.sendUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>(
        DASHBOARD_EVENTS.SESSION_CREATED,
        {
          title: state.title,
          description: state.description,
          markdownContent,
        }
      );

      action = {
        type: 'plan_visualizations',
        success: true,
        plannedPanels,
      };

      return {
        plannedPanels,
        markdownContent,
        actions: [action],
      };
    } catch (error) {
      logger.error(`Failed to plan visualizations: ${error.message}`);
      action = {
        type: 'plan_visualizations',
        success: false,
        error: error.message,
      };
      return {
        actions: [action],
      };
    }
  };
}
