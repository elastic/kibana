/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { Evaluator, Example } from '@kbn/evals';
import type { EnhanceDefectId } from './evaluators/seed_defects';
import type { EnhanceMode } from './extract_dashboard';
import type { EsqlQueryResultsData } from './fixtures/dissect_logs_results';

export type { EnhanceMode };

/** Which skill the request should reach: the dashboard skill, the visualization skill, or neither. */
export type DashboardRoute = 'dashboard' | 'visualization' | 'none';

/** What the prompt pins down about the produced dashboard; anything not listed is unchecked. */
export interface DashboardStructureGold {
  panelCount?: { min?: number; max?: number };
  /** Exact number of panels per kind (`metric`, `xy`, `markdown`, …); unlisted kinds are free. */
  panelKinds?: Record<string, number>;
  sectionCount?: number;
  sections?: Array<{ titleIncludesAny: string[]; minPanels?: number }>;
}

export interface EnhanceGold {
  mode: EnhanceMode;
  /** True when the request does not name a mode, so the agent must ask. */
  asksMode: boolean;
  /** Rules the seeded dashboard breaks that this mode is expected to fix. */
  defects: EnhanceDefectId[];
}

/** Where the dashboard's controls may draw their fields from, and what the prompt asked of them. */
export interface ControlsGold {
  /**
   * True when the prompt asked for controls. The agent then flags them
   * `user_requested`, and accounts for any the server could not add.
   */
  requested: boolean;
  /** Fields mapped on the dashboard's index; a control on any other field is a broken dropdown. */
  mappedFields: readonly string[];
  /** Fields the prompt names a control for, matched with or without `.keyword`. */
  mustInclude?: readonly string[];
  /**
   * Filters the prompt asks for by name. Each needs a stored control on one of
   * its substitutes, or a reply sentence that names it and says it could not be added.
   */
  requestedFilters?: readonly RequestedFilterGold[];
}

export interface RequestedFilterGold {
  name: string;
  /** Words that name the filter in the reply, matched as whole words. */
  terms: readonly string[];
  /** Mapped fields that stand in for it, matched with or without `.keyword`. */
  substitutes: readonly string[];
}

export type DashboardDatasetExample = Example<
  {
    question: string;
    /** Seeded dashboard sent as a by-value attachment with the opening turn. */
    dashboard?: DashboardAttachmentData;
    /** Mode to pick if the agent asks which enhance mode to apply. */
    modeAnswer?: EnhanceMode;
    /** Discover ES|QL results sent as an attachment with the opening turn, as the 'AI Agent' action does. */
    esqlResults?: EsqlQueryResultsData;
  },
  {
    route?: DashboardRoute;
    structure?: DashboardStructureGold;
    enhance?: EnhanceGold;
    controls?: ControlsGold;
    goldenToolPath?: string[];
  },
  {
    agentId?: string;
    [key: string]: unknown;
  }
>;

export interface DashboardAgentTaskOutput {
  /** Error results of the agent's tool calls. */
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  agentTraceId?: string;
  /** One agent trace per converse turn, in order; `agentTraceId` is the last. */
  agentTraceIds?: string[];
  traceId?: string;
  /** Number of converse turns the task ran (2 when it answered the mode question). */
  turns?: number;
  /** Structured prompts the agent raised on the opening turn. */
  openingPrompts?: unknown[];
  /** Tool ids the agent called on the opening turn. */
  openingToolIds?: string[];
  /** The seeded dashboard as the conversation stored it. */
  before?: DashboardAttachmentData;
  /** The dashboard after the last turn, read from the conversation. */
  dashboard?: DashboardAttachmentData;
}

export type DashboardAgentEvaluator = Evaluator<DashboardDatasetExample, DashboardAgentTaskOutput>;

export type EvaluateDataset = ({
  dataset,
}: {
  dataset: {
    name: string;
    description: string;
    examples: DashboardDatasetExample[];
  };
}) => Promise<void>;
