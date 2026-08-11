/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/agent-builder-server';
import {
  createEmptyRunContext,
  forkContextForToolRun,
  forkContextForAgentRun,
} from './run_context';

describe('RunContext utilities', () => {
  describe('creatEmptyRunContext', () => {
    it('should create an empty run context with a generated UUID', () => {
      const context = createEmptyRunContext();
      expect(context).toEqual({
        runId: expect.any(String),
        stack: [],
      });
    });

    it('should create an empty run context with provided runId', () => {
      const runId = 'test-run-id';
      const context = createEmptyRunContext({ runId });
      expect(context).toEqual({
        runId,
        stack: [],
      });
    });
  });

  describe('forkContextForToolRun', () => {
    it('should fork context and add tool to stack', () => {
      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [],
      };

      const toolId = 'test-tool';
      const forkedContext = forkContextForToolRun({ toolId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId,
          },
        ],
      });
    });

    it('should preserve existing stack entries when forking', () => {
      const existingToolId = 'existing-tool';
      const newToolId = 'new-tool';

      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId: existingToolId,
          },
        ],
      };

      const forkedContext = forkContextForToolRun({ toolId: newToolId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId: existingToolId,
          },
          {
            type: 'tool',
            toolId: newToolId,
          },
        ],
      });
    });
  });

  describe('forkContextForAgentRun', () => {
    it('should fork context and add agent to stack', () => {
      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [],
      };

      const agentId = 'test-agent';
      const forkedContext = forkContextForAgentRun({ agentId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId,
          },
        ],
      });
    });

    it('should preserve existing stack entries when forking', () => {
      const existingAgentId = 'existing-agent';
      const newAgentId = 'new-agent';

      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId: existingAgentId,
          },
        ],
      };

      const forkedContext = forkContextForAgentRun({ agentId: newAgentId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId: existingAgentId,
          },
          {
            type: 'agent',
            agentId: newAgentId,
          },
        ],
      });
    });
  });
});
