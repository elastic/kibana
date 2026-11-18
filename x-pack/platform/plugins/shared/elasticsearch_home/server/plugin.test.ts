/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { WEB_CRAWLS_PATH, WEB_CRAWL_CANCEL_PATH, WEB_CRAWL_PATH } from '../common/constants';
import { WEB_CRAWL_STEP_ID } from '../common/web_crawl_step';
import { ElasticsearchHomePlugin } from './plugin';
import { WEB_CRAWL_TASK_TYPE } from './web_crawl/task';

describe('ElasticsearchHomePlugin', () => {
  let core: ReturnType<typeof coreMock.createSetup>;
  let router: ReturnType<ReturnType<typeof coreMock.createSetup>['http']['createRouter']>;
  let taskManager: ReturnType<typeof taskManagerMock.createSetup>;
  let features: ReturnType<typeof featuresPluginMock.createSetup>;
  let plugin: ElasticsearchHomePlugin;

  const getPaths = (calls: Array<[{ path: string }, ...unknown[]]>) =>
    calls.map(([{ path }]) => path);

  beforeEach(() => {
    core = coreMock.createSetup();
    router = core.http.createRouter();
    core.http.createRouter.mockReturnValue(router);
    taskManager = taskManagerMock.createSetup();
    features = featuresPluginMock.createSetup();
    plugin = new ElasticsearchHomePlugin(coreMock.createPluginInitializerContext());
  });

  it('registers the web crawl task and routes', () => {
    plugin.setup(core, { features, taskManager });

    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(Object.keys(taskManager.registerTaskDefinitions.mock.calls[0][0])).toEqual([
      WEB_CRAWL_TASK_TYPE,
    ]);
    expect(getPaths(jest.mocked(router.post).mock.calls)).toEqual(
      expect.arrayContaining([WEB_CRAWLS_PATH, WEB_CRAWL_CANCEL_PATH])
    );
    expect(getPaths(jest.mocked(router.get).mock.calls)).toEqual(
      expect.arrayContaining([WEB_CRAWLS_PATH, WEB_CRAWL_PATH])
    );
    expect(getPaths(jest.mocked(router.delete).mock.calls)).toEqual([WEB_CRAWL_PATH]);
  });

  it('sets up without the workflows extensions plugin', () => {
    expect(() => plugin.setup(core, { features, taskManager })).not.toThrow();
  });

  it('registers the web crawl workflow step when the workflows extensions plugin is available', () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    plugin.setup(core, { features, taskManager, workflowsExtensions });

    expect(workflowsExtensions.registerStepDefinition).toHaveBeenCalledTimes(1);
    const [definition] = workflowsExtensions.registerStepDefinition.mock.calls[0];
    expect(definition).toEqual(
      expect.objectContaining({
        id: WEB_CRAWL_STEP_ID,
        start: expect.any(Function),
        poll: expect.any(Function),
        onCancel: expect.any(Function),
      })
    );
  });

  it('does not resolve the start services while setting up', () => {
    plugin.setup(core, {
      features,
      taskManager,
      workflowsExtensions: workflowsExtensionsMock.createSetup(),
    });

    expect(core.getStartServices).not.toHaveBeenCalled();
  });
});
