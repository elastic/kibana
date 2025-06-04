/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedRunnerRunToolsParams, RunToolParams } from '@kbn/onechat-server';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  CreateScopedRunnerDepsMock,
  MockedTool,
} from '../../test_utils';
import { createScopedRunner, createRunner } from './runner';

describe('Onechat runner', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
  });

  describe('runTool', () => {
    let tool: MockedTool;

    beforeEach(() => {
      const {
        toolsService: { registry },
      } = runnerDeps;

      tool = createMockedTool({});
      registry.get.mockResolvedValue(tool);
    });

    it('can be invoked through a scoped runner', async () => {
      tool.handler.mockReturnValue({ someProp: 'someValue' });

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        result: { someProp: 'someValue' },
      });
    });

    it('can be invoked through a runner', async () => {
      tool.handler.mockReturnValue({ someProp: 'someValue' });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunToolParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        result: { someProp: 'someValue' },
      });
    });
  });
});
