/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  CRAWL_STEP_ID,
  crawlStepCommonDefinition,
  type CrawlInput,
  type CrawlOutput,
} from '../common/crawl_step';
import type { CrawlScheduleStatus, CrawlSettings } from '../common/types';
import type { MemoryStore } from './memory';

type Management = WorkflowsServerPluginSetup['management'];

const connectorTag = (connectorId: string) => `connector-memory:${connectorId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A scheduled crawl's settings as the step's input. */
export const inputOfCrawl = (connectorId: string, crawl: CrawlSettings): Partial<CrawlInput> => ({
  connector_id: connectorId,
  folder: crawl.folder ?? '',
  max_depth: crawl.maxDepth,
  max_items: crawl.maxFiles,
  mode: crawl.mode,
  ...(crawl.inferenceConnectorId !== undefined && {
    inference_connector_id: crawl.inferenceConnectorId,
  }),
});

/**
 * The workflow every run of memory is: a manual trigger, optionally a schedule, and the crawl step with the given
 * inputs. A saved crawl, a one-off run and an agent's read differ only in those inputs. JSON is valid YAML, so values
 * are written as JSON and need no escaping of their own.
 */
export const renderWorkflow = ({
  connectorId,
  input,
  everyMinutes,
}: {
  connectorId: string;
  input: Partial<CrawlInput>;
  /** Present: the workflow also runs on this schedule. */
  everyMinutes?: number;
}): string => {
  const triggers =
    everyMinutes === undefined
      ? '  - type: manual'
      : `  - type: manual
  - type: scheduled
    with:
      every: ${JSON.stringify(`${everyMinutes}m`)}`;

  return `version: "1"
name: ${JSON.stringify(`Connector memory - crawl - ${connectorId}`)}
description: ${JSON.stringify(
    `Remembers files of connector ${connectorId}. Managed from the connector's Context tab.`
  )}
enabled: true
tags: ${JSON.stringify(['connector-memory', connectorTag(connectorId)])}
triggers:
${triggers}
steps:
  - name: remember
    type: ${CRAWL_STEP_ID}
    with: ${JSON.stringify(input)}
`;
};

const toMinutes = (every: string): number | undefined => {
  const match = /^(\d+)([smhd])$/.exec(every);
  return match
    ? Math.round(
        Number(match[1]) * { s: 1 / 60, m: 1, h: 60, d: 1440 }[match[2] as 's' | 'm' | 'h' | 'd']
      )
    : undefined;
};

/** The crawl a saved workflow says it does, or undefined when it is not one of ours. */
export const crawlOfDefinition = (definition: unknown): CrawlSettings | undefined => {
  if (!isRecord(definition) || !Array.isArray(definition.steps)) {
    return undefined;
  }
  const step = definition.steps.find((item) => isRecord(item) && item.type === CRAWL_STEP_ID);
  const input = isRecord(step) && isRecord(step.with) ? step.with : undefined;
  if (input === undefined || typeof input.connector_id !== 'string') {
    return undefined;
  }
  const trigger = Array.isArray(definition.triggers)
    ? definition.triggers.find((item) => isRecord(item) && item.type === 'scheduled')
    : undefined;
  const every = isRecord(trigger) && isRecord(trigger.with) ? trigger.with.every : undefined;
  return {
    ...(typeof input.folder === 'string' && input.folder !== '' && { folder: input.folder }),
    maxDepth: typeof input.max_depth === 'number' ? input.max_depth : 1,
    maxFiles: typeof input.max_items === 'number' ? input.max_items : 100,
    mode: input.mode === 'full' ? 'full' : 'names',
    ...(typeof input.inference_connector_id === 'string' && {
      inferenceConnectorId: input.inference_connector_id,
    }),
    intervalMinutes: (typeof every === 'string' && toMinutes(every)) || 1440,
  };
};

interface Target {
  request: KibanaRequest;
  spaceId: string;
  connectorId: string;
}

/** A connector's crawl as a Context Engine automation: a saved workflow attached to the memory index. */
export class CrawlWorkflows {
  constructor(
    private readonly deps: { getManagement: () => Management; store: MemoryStore; logger: Logger }
  ) {}

  /** The connector's saved workflow, found among the automations of the memory index by its tag. */
  private async find({ request, spaceId, connectorId }: Target) {
    for (const id of await this.deps.store.automations(spaceId)) {
      const workflow = await this.deps
        .getManagement()
        .getWorkflow(id, spaceId, request)
        .catch(() => null);
      if (workflow?.tags?.includes(connectorTag(connectorId))) {
        return workflow;
      }
    }
    return undefined;
  }

  /** Creates the connector's crawl, or replaces it, and attaches it to the index. It runs as the caller. */
  async save(target: Target & { crawl: CrawlSettings }): Promise<void> {
    const { request, spaceId, connectorId, crawl } = target;
    const yaml = renderWorkflow({
      connectorId,
      input: inputOfCrawl(connectorId, crawl),
      everyMinutes: crawl.intervalMinutes,
    });
    const management = this.deps.getManagement();
    const existing = await this.find(target);
    const id = existing
      ? (await management.updateWorkflow(existing.id, { yaml }, spaceId, request), existing.id)
      : (await management.createWorkflow({ yaml }, spaceId, request)).id;
    await this.deps.store.attachAutomation(spaceId, id);
  }

  async read(target: Target): Promise<CrawlScheduleStatus | undefined> {
    const workflow = await this.find(target);
    if (!workflow) {
      return undefined;
    }
    const executions = await this.deps
      .getManagement()
      .getWorkflowExecutions(
        { workflowId: workflow.id, size: 1, page: 1, request: target.request },
        target.spaceId
      )
      .catch(() => undefined);
    const last = executions?.results?.[0];
    const crawl = crawlOfDefinition(workflow.definition);
    return {
      status: workflow.enabled ? 'idle' : 'disabled',
      ...(crawl && { crawl }),
      ...(last && {
        lastRun: {
          at: String(last.startedAt),
          status: String(last.status),
          ...(typeof last.duration === 'number' && { durationMs: last.duration }),
        },
      }),
    };
  }

  async remove(target: Target): Promise<void> {
    const workflow = await this.find(target);
    if (workflow) {
      await this.deps
        .getManagement()
        .deleteWorkflows([workflow.id], target.spaceId, target.request);
      await this.deps.store.detachAutomation(target.spaceId, workflow.id);
    }
  }

  /** Runs the saved crawl now; false when the connector has none. */
  async runNow(target: Target): Promise<boolean> {
    const workflow = await this.find(target);
    if (!workflow) {
      return false;
    }
    await this.deps.getManagement().executeWorkflow({
      workflowId: workflow.id,
      spaceId: target.spaceId,
      request: target.request,
      waitForCompletion: false,
      triggeredBy: 'connector-memory',
    });
    return true;
  }

  /** Runs the same workflow once, unsaved, with the given inputs: what an agent's read does. */
  async runOnce({
    request,
    spaceId,
    connectorId,
    input,
  }: Target & { input: Partial<CrawlInput> }): Promise<void> {
    await this.deps.getManagement().executeWorkflow({
      yaml: renderWorkflow({ connectorId, input }),
      spaceId,
      request,
      waitForCompletion: false,
      triggeredBy: 'connector-memory',
    });
  }
}

/** The crawl step: runs a plan as the user the workflow runs as. */
export const crawlStep = (
  run: (params: {
    input: CrawlInput;
    request: KibanaRequest;
    spaceId: string;
    signal: AbortSignal;
  }) => Promise<CrawlOutput>
) =>
  createServerStepDefinition({
    ...crawlStepCommonDefinition,
    handler: async (context) => {
      try {
        const output = await run({
          input: context.input,
          request: context.contextManager.getFakeRequest(),
          spaceId: context.contextManager.getContext().workflow.spaceId,
          signal: context.abortSignal,
        });
        return { output };
      } catch (error) {
        return {
          error: new ExecutionError({
            type: 'ApiError',
            message: error instanceof Error ? error.message : 'The crawl failed.',
          }),
        };
      }
    },
  });
