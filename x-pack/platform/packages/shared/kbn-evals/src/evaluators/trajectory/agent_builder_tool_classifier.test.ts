/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools, internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import { createTrajectoryEvaluator } from '.';
import type { TrajectoryToolCall } from '.';
import {
  createAgentBuilderToolClassifier,
  createUnclassifiedToolsEvaluator,
  getAgentBuilderToolCalls,
} from './agent_builder_tool_classifier';

describe('getAgentBuilderToolCalls', () => {
  it('returns tool call ids with the recorded origin', () => {
    expect(
      getAgentBuilderToolCalls({
        steps: [
          { type: 'reasoning', reasoning: 'x' },
          { type: 'tool_call', tool_id: 'attachments.read', tool_origin: 'internal' },
          { type: 'tool_call', tool_id: 'platform.core.list_indices', tool_origin: 'registry' },
          { type: 'tool_call', tool_id: 'legacy_round_tool' },
          { type: 'tool_call' },
        ],
      })
    ).toEqual([
      { id: 'attachments.read', origin: 'internal' },
      { id: 'platform.core.list_indices', origin: 'registry' },
      { id: 'legacy_round_tool' },
    ]);
  });
});

describe('createAgentBuilderToolClassifier', () => {
  const classify = createAgentBuilderToolClassifier({ knownToolIds: ['virustotal_lookup'] });

  it.each([
    attachmentTools.read,
    attachmentTools.add,
    internalTools.writeTodos,
    internalTools.loadSkill,
  ])('drops the runtime tool %s on both paths', (id) => {
    expect(classify({ id })).toBe('runtime');
    expect(classify({ id, origin: 'internal' })).toBe('runtime');
  });

  it.each([
    internalTools.executeApi,
    internalTools.readFile,
    internalTools.listFiles,
    internalTools.bash,
  ])('scores the data-reaching internal tool %s', (id) => {
    expect(classify({ id })).toBe('scored');
    expect(classify({ id, origin: 'internal' })).toBe('scored');
  });

  it('scores domain tools by origin on the conversation path', () => {
    expect(classify({ id: platformCoreTools.listIndices, origin: 'registry' })).toBe('scored');
    expect(classify({ id: 'user_defined_tool', origin: 'registry' })).toBe('scored');
    expect(classify({ id: 'skill-inline.tool', origin: 'inline' })).toBe('scored');
  });

  it('scores built-in domain tools and known tool ids on the trace path', () => {
    expect(classify({ id: platformCoreTools.search })).toBe('scored');
    expect(classify({ id: 'security.alerts' })).toBe('scored');
    expect(classify({ id: 'virustotal_lookup' })).toBe('scored');
  });

  it('leaves a new internal tool Agent Builder has not classified unclassified', () => {
    expect(classify({ id: 'plan_next_step', origin: 'internal' })).toBe('unclassified');
    // The runtime's own origin wins over the id-based fallbacks used on the trace path.
    expect(classify({ id: 'platform.core.plan_next_step', origin: 'internal' })).toBe(
      'unclassified'
    );
    expect(classify({ id: 'virustotal_lookup', origin: 'internal' })).toBe('unclassified');
  });

  it('leaves an unknown id without origin unclassified', () => {
    expect(classify({ id: 'plan_next_step' })).toBe('unclassified');
  });

  it('pins browser API tools (origin internal, not classified by Agent Builder) as unclassified', () => {
    expect(
      createAgentBuilderToolClassifier({ knownToolIds: ['browser_api_navigate'] })({
        id: 'browser_api_navigate',
        origin: 'internal',
      })
    ).toBe('unclassified');
  });

  it('does not silently drop an unknown attachments.* tool (N/A, not a false match)', async () => {
    const evaluator = createTrajectoryEvaluator({
      extractToolCalls: (output) => output as TrajectoryToolCall[],
      goldenPathExtractor: () => [],
      classifyTool: classify,
    });
    expect(
      await evaluator.evaluate({
        input: {},
        output: [{ id: 'attachments.fetch_from_es', origin: 'internal' }],
        expected: {},
        metadata: null,
      })
    ).toMatchObject({
      score: null,
      label: 'N/A',
      explanation: 'unclassified-tool:attachments.fetch_from_es',
    });
  });

  it('makes a trajectory with a simulated new Agent Builder tool N/A instead of 0', async () => {
    const evaluator = createTrajectoryEvaluator({
      extractToolCalls: (output) => output as string[],
      goldenPathExtractor: () => [],
      classifyTool: classify,
    });
    const run = (output: string[]) =>
      evaluator.evaluate({ input: {}, output, expected: {}, metadata: null });

    expect(await run([attachmentTools.add, internalTools.writeTodos])).toMatchObject({
      score: 1,
    });
    expect(await run([attachmentTools.add, 'plan_next_step'])).toMatchObject({
      score: null,
      label: 'N/A',
      explanation: 'unclassified-tool:plan_next_step',
    });
    expect(await run([attachmentTools.add, 'security.alerts'])).toMatchObject({ score: 0 });
  });
});

describe('createUnclassifiedToolsEvaluator', () => {
  const evaluator = createUnclassifiedToolsEvaluator({
    extractToolCalls: (output) => output as string[],
    classifyTool: createAgentBuilderToolClassifier(),
  });
  const run = (output: string[]) =>
    evaluator.evaluate({ input: {}, output, expected: {}, metadata: null });

  it('counts distinct unclassified tools', async () => {
    const result = await run(['new_a', attachmentTools.read, 'new_b', 'new_a', 'security.alerts']);
    expect(result).toMatchObject({
      score: 2,
      metadata: { unclassifiedToolIds: ['new_a', 'new_b'] },
    });
  });

  it('scores 0 when every tool is classified', async () => {
    expect(await run([attachmentTools.read, 'security.alerts'])).toMatchObject({ score: 0 });
  });

  it('exempts golden tools like the trajectory evaluator, so the two agree', async () => {
    const extractToolCalls = (output: unknown) => output as string[];
    const goldenPathExtractor = () => ['my_custom'];
    const classifyTool = createAgentBuilderToolClassifier();
    const args = { input: {}, output: ['my_custom'], expected: {}, metadata: null };

    expect(
      await createTrajectoryEvaluator({
        extractToolCalls,
        goldenPathExtractor,
        classifyTool,
      }).evaluate(args)
    ).toMatchObject({ score: 1 });
    expect(
      await createUnclassifiedToolsEvaluator({
        extractToolCalls,
        goldenPathExtractor,
        classifyTool,
      }).evaluate(args)
    ).toMatchObject({ score: 0, metadata: { unclassifiedToolIds: [] } });
    // Without the extractor the golden tool is counted.
    expect(await run(['my_custom'])).toMatchObject({ score: 1 });
  });

  it('is a lower-is-better code evaluator', () => {
    expect(evaluator).toMatchObject({
      name: 'unclassified-tools',
      kind: 'CODE',
      direction: 'minimize',
    });
  });
});
