/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { getContextStatus, hasDefaultAiIndex } from './context_status';

type AgentShape = Pick<AgentDefinition, 'type' | 'configuration'>;

const agent = (type: string, aiIndices?: string[]): AgentShape =>
  ({
    type,
    configuration: { tools: [], ...(aiIndices === undefined ? {} : { ai_indices: aiIndices }) },
  } as AgentShape);

describe('hasDefaultAiIndex', () => {
  it('is true for chat agents, which get the `elastic` index merged in at runtime', () => {
    expect(hasDefaultAiIndex({ type: chatAgentTypeId })).toBe(true);
  });

  it('is false for any other agent type', () => {
    expect(hasDefaultAiIndex({ type: 'custom_type' })).toBe(false);
  });
});

describe('getContextStatus', () => {
  describe('with configured AI indices', () => {
    it('returns "on" for a chat agent', () => {
      expect(getContextStatus(agent(chatAgentTypeId, ['sales']))).toBe('on');
    });

    it('returns "on" for a non-chat agent type as well', () => {
      expect(getContextStatus(agent('custom_type', ['sales']))).toBe('on');
    });
  });

  describe('with an empty AI index list', () => {
    it('returns "auto" for a chat agent, which still gets the default index merged in', () => {
      expect(getContextStatus(agent(chatAgentTypeId, []))).toBe('auto');
    });

    it('returns "off" for a type that contributes no default', () => {
      expect(getContextStatus(agent('custom_type', []))).toBe('off');
    });
  });

  describe('with no ai_indices field at all', () => {
    it('returns "auto" for a chat agent', () => {
      expect(getContextStatus(agent(chatAgentTypeId))).toBe('auto');
    });

    it('returns "off" for a type that contributes no default', () => {
      expect(getContextStatus(agent('custom_type'))).toBe('off');
    });
  });
});
