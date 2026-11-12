/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { CrawlSettings } from '../common/types';
import {
  CrawlWorkflows,
  crawlOfDefinition,
  crawlStep,
  inputOfCrawl,
  renderWorkflow,
} from './workflow';

const crawl: CrawlSettings = {
  maxDepth: 2,
  maxFiles: 300,
  mode: 'full',
  inferenceConnectorId: 'llm-1',
  intervalMinutes: 360,
};

describe('renderWorkflow', () => {
  it('is one crawl step with a manual trigger, and a schedule only when it is a saved crawl', () => {
    const tricky = { connector_id: 'drive-1', files: ['f1'], folder: 'a "b" \\c\nd' };
    const saved = parse(
      renderWorkflow({
        connectorId: 'drive-1',
        input: inputOfCrawl('drive-1', crawl),
        everyMinutes: 360,
      })
    );
    const once = parse(renderWorkflow({ connectorId: 'drive-1', input: tricky }));

    expect(saved).toMatchObject({
      name: 'Connector memory - crawl - drive-1',
      tags: ['connector-memory', 'connector-memory:drive-1'],
      triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '360m' } }],
      steps: [{ type: 'connector-memory.crawl', with: inputOfCrawl('drive-1', crawl) }],
    });
    // The inputs come back exactly as they went in, whatever characters they hold.
    expect(once).toMatchObject({
      triggers: [{ type: 'manual' }],
      steps: [{ with: tricky }],
    });
  });

  it('reads back as the crawl it was made from, with its interval', () => {
    const definition = {
      triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '6h' } }],
      steps: [{ type: 'connector-memory.crawl', with: inputOfCrawl('drive-1', crawl) }],
    };

    expect(crawlOfDefinition(definition)).toEqual(crawl);
    expect(crawlOfDefinition({ steps: [{ type: 'slack' }] })).toBeUndefined();
  });
});

describe('CrawlWorkflows', () => {
  const setup = (existing = false) => {
    const management = {
      getWorkflow: jest.fn(async () =>
        existing
          ? { id: 'wf-1', enabled: true, tags: ['connector-memory:drive-1'], definition: null }
          : null
      ),
      createWorkflow: jest.fn().mockResolvedValue({ id: 'wf-new' }),
      updateWorkflow: jest.fn().mockResolvedValue({}),
      deleteWorkflows: jest.fn().mockResolvedValue({}),
      executeWorkflow: jest.fn().mockResolvedValue({}),
      getWorkflowExecutions: jest.fn().mockResolvedValue({
        results: [{ startedAt: '2026-11-04T00:00:00Z', status: 'completed', duration: 1200 }],
      }),
    };
    const store = {
      automations: jest.fn().mockResolvedValue(existing ? ['wf-1'] : []),
      attachAutomation: jest.fn(),
      detachAutomation: jest.fn(),
    };
    const workflows = new CrawlWorkflows({
      getManagement: () => management as never,
      store: store as never,
      logger: loggingSystemMock.createLogger(),
    });
    const target = {
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      connectorId: 'drive-1',
    };
    return { management, store, workflows, target };
  };

  it('creates the connector’s crawl as the caller and attaches it to the index, or updates the one it has', async () => {
    const fresh = setup();
    await fresh.workflows.save({ ...fresh.target, crawl });
    expect(fresh.management.createWorkflow).toHaveBeenCalledWith(
      { yaml: expect.stringContaining('connector-memory.crawl') },
      'default',
      fresh.target.request
    );
    expect(fresh.store.attachAutomation).toHaveBeenCalledWith('default', 'wf-new');

    const again = setup(true);
    await again.workflows.save({ ...again.target, crawl });
    expect(again.management.createWorkflow).not.toHaveBeenCalled();
    expect(again.management.updateWorkflow).toHaveBeenCalledWith(
      'wf-1',
      { yaml: expect.any(String) },
      'default',
      again.target.request
    );
  });

  it('reads the last run, removes the workflow with its place on the index, and runs it now', async () => {
    const { management, store, workflows, target } = setup(true);

    expect(await workflows.read(target)).toMatchObject({
      status: 'idle',
      lastRun: { status: 'completed', durationMs: 1200 },
    });
    expect(await workflows.runNow(target)).toBe(true);
    expect(management.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-1', waitForCompletion: false })
    );
    await workflows.remove(target);
    expect(management.deleteWorkflows).toHaveBeenCalledWith(['wf-1'], 'default', target.request);
    expect(store.detachAutomation).toHaveBeenCalledWith('default', 'wf-1');
  });

  it('says there is nothing to run for a connector with no crawl, and runs the same workflow once, unsaved, for a read', async () => {
    const none = setup();
    expect(await none.workflows.runNow(none.target)).toBe(false);

    await none.workflows.runOnce({
      ...none.target,
      input: { connector_id: 'drive-1', files: ['f1'] },
    });
    expect(none.management.executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        yaml: expect.stringContaining('"files":["f1"]'),
        waitForCompletion: false,
      })
    );
  });
});

describe('crawlStep', () => {
  it('runs the crawl as the workflow’s user and reports a failure as an error of the step', async () => {
    const request = httpServerMock.createKibanaRequest();
    const run = jest
      .fn()
      .mockResolvedValue({ planned: 1, written: 1, unchanged: 0, failed: 0, truncated: false });
    const context = (input: Record<string, unknown>) =>
      ({
        input,
        abortSignal: new AbortController().signal,
        contextManager: {
          getFakeRequest: () => request,
          getContext: () => ({ workflow: { spaceId: 'default' } }),
        },
      } as never);

    const step = crawlStep(run);
    expect(await step.handler(context({ connector_id: 'drive-1' }))).toEqual({
      output: expect.objectContaining({ written: 1 }),
    });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ request, spaceId: 'default' }));

    run.mockRejectedValue(new Error('no profile'));
    expect(await step.handler(context({ connector_id: 'drive-1' }))).toMatchObject({
      error: { message: 'no profile' },
    });
  });
});
