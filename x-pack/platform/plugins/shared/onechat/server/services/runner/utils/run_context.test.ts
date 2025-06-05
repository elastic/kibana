/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBuiltinToolId,
  toSerializedToolIdentifier,
  toSerializedAgentIdentifier,
  type AgentIdentifier,
} from '@kbn/onechat-common';
import type { RunContext } from '@kbn/onechat-server';
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

      const toolId = createBuiltinToolId('test-tool');
      const expectedSerializedToolId = toSerializedToolIdentifier(toolId);
      const forkedContext = forkContextForToolRun({ toolId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId: expectedSerializedToolId,
          },
        ],
      });
    });

    it('should preserve existing stack entries when forking', () => {
      const existingToolId = createBuiltinToolId('existing-tool');
      const newToolId = createBuiltinToolId('new-tool');

      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId: toSerializedToolIdentifier(existingToolId),
          },
        ],
      };

      const forkedContext = forkContextForToolRun({ toolId: newToolId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'tool',
            toolId: toSerializedToolIdentifier(existingToolId),
          },
          {
            type: 'tool',
            toolId: toSerializedToolIdentifier(newToolId),
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

      const agentId: AgentIdentifier = {
        agentId: 'test-agent',
        providerId: 'test-provider',
      };
      const expectedSerializedAgentId = toSerializedAgentIdentifier(agentId);
      const forkedContext = forkContextForAgentRun({ agentId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId: expectedSerializedAgentId,
          },
        ],
      });
    });

    it('should preserve existing stack entries when forking', () => {
      const existingAgentId: AgentIdentifier = {
        agentId: 'existing-agent',
        providerId: 'test-provider',
      };
      const newAgentId: AgentIdentifier = {
        agentId: 'new-agent',
        providerId: 'test-provider',
      };

      const parentContext: RunContext = {
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId: toSerializedAgentIdentifier(existingAgentId),
          },
        ],
      };

      const forkedContext = forkContextForAgentRun({ agentId: newAgentId, parentContext });

      expect(forkedContext).toEqual({
        runId: 'parent-run-id',
        stack: [
          {
            type: 'agent',
            agentId: toSerializedAgentIdentifier(existingAgentId),
          },
          {
            type: 'agent',
            agentId: toSerializedAgentIdentifier(newAgentId),
          },
        ],
      });
    });
  });
});
