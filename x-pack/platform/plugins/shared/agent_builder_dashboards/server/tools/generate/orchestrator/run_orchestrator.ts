/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { PanelFailure } from '../core/utils';
import type { ResolvePanelContent } from '../core/operations/panels';
import { findLastAgentStep } from './actions';
import { createDashboardOrchestratorGraph } from './graph';
import { emptyDashboard } from './state';

export interface RunOrchestratorOptions {
  /** Natural-language description of what to build or change. */
  request: string;
  /** When editing, the current dashboard payload read from the attachment. */
  dashboard?: DashboardAttachmentData;
  /** Free-form additional context (user prompt extras). */
  additionalContext?: string;
  /** Free-form additional instructions (system prompt extras). */
  additionalInstructions?: string;
  /** Hard bound on tool-capable turns. One final text-only drain may follow. Defaults to 15. */
  maxAgentTurns?: number;
}

export interface RunOrchestratorDeps {
  model: ScopedModel;
  logger: Logger;
  /** Inline panel resolver; required for panel-request creating/editing tools. */
  resolvePanelContent?: ResolvePanelContent;
  /** For the explore_data lookup tool. */
  esClient?: IScopedClusterClient;
}

export type RunOrchestratorParams = RunOrchestratorOptions & RunOrchestratorDeps;

export interface RunOrchestratorResult {
  /** The dashboard payload after the agent loop finished. */
  dashboard: DashboardAttachmentData;
  /**
   * Terminal per-panel failures the authoring agent did not recover before
   * finishing. Internal visualization-generation attempts are never exposed.
   */
  failures: PanelFailure[];
  /** The natural-language text content of the LLM's final turn. */
  response: string;
}

/**
 * Runs the inner dashboard-generation agent loop.
 *
 * The caller receives the best-effort payload together with terminal panel
 * failures the authoring agent did not recover.
 */
export const runDashboardOrchestrator = async ({
  request,
  dashboard,
  additionalContext,
  additionalInstructions,
  maxAgentTurns = 15,
  model,
  logger,
  resolvePanelContent,
  esClient,
}: RunOrchestratorParams): Promise<RunOrchestratorResult> => {
  const graph = createDashboardOrchestratorGraph({
    model,
    logger,
    resolvePanelContent,
    esClient,
    includeCritique: dashboard !== undefined,
  });

  return withActiveInferenceSpan(
    'GenerateDashboardGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      // Entry-time clone (like the old operations core): the caller's object
      // must never alias graph state or the returned payload.
      const initialDashboard = dashboard ? structuredClone(dashboard) : emptyDashboard();

      const out = await graph.invoke(
        {
          request,
          existingDashboard: dashboard ? initialDashboard : undefined,
          dashboard: initialDashboard,
          additionalContext,
          additionalInstructions,
          maxAgentTurns,
        },
        {
          // The turn bound structurally terminates the loop before this
          // limit; sized so the final drain can never trip a recursion error.
          recursionLimit: 2 * maxAgentTurns + 5,
          tags: ['generate_dashboard'],
          metadata: { graphName: 'generate_dashboard' },
        }
      );

      // The last agent_step carries the model's final natural-language text.
      // It can be empty when the turn bound drains immediately after tools.
      const lastAgentStep = findLastAgentStep(out.actions);
      const response = lastAgentStep?.text ?? '';
      const failures = Object.values(out.activeFailures).map(({ type, identifier, error }) => ({
        type,
        identifier,
        error,
      }));

      return {
        dashboard: out.dashboard,
        failures,
        response,
      };
    }
  );
};
