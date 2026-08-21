/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { smlIndexName } from '@kbn/agent-builder-sml-plugin/server';
import { getAiIndicesInstructions } from './ai_indices';

describe('getAiIndicesInstructions', () => {
  it('renders nothing when AI index instructions are disabled', () => {
    expect(
      getAiIndicesInstructions({
        enabled: false,
        aiIndices: [agentBuilderDefaultAiIndexId],
        spaceId: 'default',
      })
    ).toBe('');
  });

  it('renders nothing for an agent with no AI indices', () => {
    expect(getAiIndicesInstructions({ enabled: true, aiIndices: [], spaceId: 'default' })).toBe('');
  });

  it('explains what an AI index is and how it is named', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('`ai-index-idx-*`');
    expect(instructions).toContain('`ai-index-ds-*`');
  });

  it('sends the agent to the underlying data when no KI covers the question', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).toContain('query the underlying data directly');
  });

  it('warns that a value written into a KI may be out of date', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).toContain('possibly out of date');
  });

  it('names the backing index of the default AI index and what it holds', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).toContain(`\`${smlIndexName}\``);
    expect(instructions).toContain('dashboards');
    expect(instructions).toContain('connectors');
  });

  it('tells the agent that entries have to be attached before they can be acted on', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).toContain('attached to the conversation');
  });

  it('names no SML tool, so the section survives their replacement by ES|QL', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'default',
    });

    expect(instructions).not.toContain('sml_');
  });

  it('names the space the conversation runs in', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'marketing',
    });

    expect(instructions).toContain('`marketing`');
  });

  it('renders a filter that also matches indices without a spaces field', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId],
      spaceId: 'marketing',
    });
    const filter = JSON.parse(instructions.match(/```json\n(.+)\n```/)![1]);

    expect(filter).toEqual({
      bool: {
        should: [
          { term: { spaces: 'marketing' } },
          { term: { spaces: '*' } },
          { bool: { must_not: { exists: { field: 'spaces' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('does not leak the Context Engine ids of the declared indices', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId, 'some-private-id'],
      spaceId: 'default',
    });

    expect(instructions).not.toContain('some-private-id');
  });

  it('points at index discovery for declared indices it cannot name', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: [agentBuilderDefaultAiIndexId, 'some-private-id'],
      spaceId: 'default',
    });

    expect(instructions).toContain('`list_indices`');
  });

  it('omits the catalog heading when no declared index can be named', () => {
    const instructions = getAiIndicesInstructions({
      enabled: true,
      aiIndices: ['some-private-id'],
      spaceId: 'default',
    });

    expect(instructions).not.toContain('Available to this agent');
    expect(instructions).toContain('`list_indices`');
  });
});
