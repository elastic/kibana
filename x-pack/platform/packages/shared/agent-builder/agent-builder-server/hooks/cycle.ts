/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  AgentConfiguration,
  AssistantResponse,
  CompactionSummary,
  ConversationRoundStep,
  InjectedContextStepData,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import type { ProcessedRoundInput } from '../processed_input';
import type { ModelProvider } from '../runner';
import type { InternalSkillDefinition } from '../skills';

export const DEFAULT_CYCLE_HOOK_TIMEOUT_MS = 10_000;
export const MAX_CYCLE_HOOK_TIMEOUT_MS = 60_000;

/** The id a built-in agent is registered with. */
export type AgentId = string;

/**
 * When a cycle hook is called: once per round before the first model call, before every research
 * model call, or before every n-th cycle (5, 10, 15, ... for `{ everyCycles: 5 }`).
 */
export type CycleTrigger = 'first' | 'every_cycle' | { everyCycles: number };

/**
 * A hook that runs at the top of agent-loop cycles and can add a note the model reads.
 */
export interface CycleHookDefinition {
  /** Unique across cycle hooks. Stamped on every step the hook appends. */
  id: string;
  /** When the handler is called. Defaults to every research cycle. */
  when?: CycleTrigger;
  /** Only run for these agents. Defaults to every agent. */
  boundAgents?: readonly AgentId[];
  /** Wall time per call, in ms. Defaults to DEFAULT_CYCLE_HOOK_TIMEOUT_MS; at most MAX_CYCLE_HOOK_TIMEOUT_MS. */
  timeout?: number;
  /** Called once per execution. Returns the handler for that execution, or `undefined` to sit it out. */
  getHandler: (execution: CycleHookExecutionContext) => MaybePromise<CycleHandler | undefined>;
}

export type CycleHandler = (cycle: CycleContext, api: CycleHookApi) => MaybePromise<void>;

/**
 * What `getHandler` receives: everything known before the first model call of the execution.
 */
export interface CycleHookExecutionContext {
  readonly request: KibanaRequest;
  readonly abortSignal: AbortSignal;
  readonly spaceId: string;

  readonly agent: {
    readonly id: string;
    readonly configuration: AgentConfiguration;
    readonly skills: readonly InternalSkillDefinition[];
  };

  readonly execution: {
    readonly id: string;
    readonly roundId: string;
    readonly resumed: boolean;
    /** Set when this run is a sub-agent spawned by another run. */
    readonly parentId?: string;
  };

  readonly input: ProcessedRoundInput;

  readonly conversation: {
    /** Absent for one-shot runs. */
    readonly id?: string;
    /** Previous rounds, oldest first. */
    readonly rounds: readonly CycleHookRound[];
  };

  /** Platform services scoped to the user. Hook owners build their own from `request`. */
  readonly services: {
    readonly logger: Logger;
    readonly modelProvider: ModelProvider;
    readonly esClient: IScopedClusterClient;
    readonly savedObjectsClient: SavedObjectsClientContract;
  };
}

export interface CycleHookRound {
  readonly id: string;
  readonly input: ProcessedRoundInput;
  readonly response?: AssistantResponse;
  readonly steps: readonly ConversationRoundStep[];
}

/**
 * What the handler receives on each call: read-only facts about the cycle about to run.
 */
export interface CycleContext {
  /** The cycle about to run, from 0. On a resume, the restored cycle. */
  readonly index: number;
  readonly timing: {
    /** Since this execution started. */
    readonly sinceStartMs: number;
    /** Since this hook last appended a note in this execution; absent if it never has. */
    readonly sinceLastAppendMs?: number;
  };
  /** This execution's steps so far, notes included. */
  readonly steps: readonly ConversationRoundStep[];
  /** The previous cycle's tool calls with params and results; empty at cycle 0. */
  readonly previousToolCalls: readonly ToolCallStep[];
  /** The compaction summary in force for this call. */
  readonly summary?: CompactionSummary;
}

export type InjectedContextInput = Omit<InjectedContextStepData, 'hook_id'>;

/**
 * The one thing a handler can do.
 */
export interface CycleHookApi {
  /** Puts text in front of the model as an `injected_context` step stamped with the hook's id.
   * Resolves when accepted, without waiting for the model.
   * Rejects invalid input or calls after the run pauses or finishes.
   */
  append(input: InjectedContextInput): Promise<void>;
}
