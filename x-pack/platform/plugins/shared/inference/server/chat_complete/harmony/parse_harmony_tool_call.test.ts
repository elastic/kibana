/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findHarmonyToolCall,
  findUnrecoveredHarmonyCallNames,
  MAX_HARMONY_TOOL_CALL_LENGTH,
  HARMONY_TOOL_CALL_HOLD,
  UNNAMED_HARMONY_TOOL_CALL,
} from './parse_harmony_tool_call';

// Verbatim tail of the assistant content a gpt-oss-120b completion returns when
// the serving layer in front of the model does not parse the harmony
// `commentary` channel (kbn-evals weekly build, suite attack-discovery-agent-builder).
const strippedCall =
  'analysisThe attachment provided is a security.alerts attachment with id 0PmRDS. ' +
  'Thus first tool call: load_skill with skill name or path "attack-discovery-generator". Let\'s do that.' +
  'assistantcommentary to=functions.load_skill json{\n  "skill": "attack-discovery-generator"\n}';

describe('findHarmonyToolCall', () => {
  it('recovers a call whose special tokens were stripped by the gateway', () => {
    const scan = findHarmonyToolCall(strippedCall);

    expect(scan).toEqual({
      type: 'call',
      call: {
        name: 'load_skill',
        arguments: '{\n  "skill": "attack-discovery-generator"\n}',
        start: expect.any(Number),
        end: strippedCall.length,
      },
    });
    expect(strippedCall.slice((scan as any).call.start)).toBe(
      'assistantcommentary to=functions.load_skill json{\n  "skill": "attack-discovery-generator"\n}'
    );
  });

  it('recovers a call that still carries its harmony markers', () => {
    const text =
      '<|start|>assistant<|channel|>commentary to=functions.security.attack-discovery.run <|constrain|>json<|message|>{"alert_retrieval_mode":"provided"}<|call|>';

    expect(findHarmonyToolCall(text)).toEqual({
      type: 'call',
      call: {
        name: 'security.attack-discovery.run',
        arguments: '{"alert_retrieval_mode":"provided"}',
        start: 0,
        end: text.length,
      },
    });
  });

  it('keeps nested braces and braces inside strings out of the argument boundary', () => {
    const text =
      'assistantcommentary to=functions.write_todos json{"todos":[{"content":"use {braces}","status":"pending"}]}';

    const scan = findHarmonyToolCall(text);

    expect(scan).toMatchObject({
      type: 'call',
      call: {
        name: 'write_todos',
        arguments: '{"todos":[{"content":"use {braces}","status":"pending"}]}',
      },
    });
  });

  it('does not end the arguments on a escaped quote or a brace inside a string', () => {
    const text =
      'assistantcommentary to=functions.write_todos json{"a":"say \\"hi}\\"","b":{"c":1}}tail';

    const scan = findHarmonyToolCall(text);

    expect(scan).toMatchObject({
      type: 'call',
      call: {
        name: 'write_todos',
        arguments: '{"a":"say \\"hi}\\"","b":{"c":1}}',
      },
    });
    expect(text.slice((scan as any).call.end)).toBe('tail');
  });

  it('reports pending while the call is still streaming in', () => {
    expect(findHarmonyToolCall('analysisassistantcommentary to=functions.')).toEqual({
      type: 'pending',
    });
    expect(
      findHarmonyToolCall('assistantcommentary to=functions.load_skill json{"skill": "attack-')
    ).toEqual({ type: 'pending' });
    expect(findHarmonyToolCall('assistantcommentary to=functions.load_sk')).toEqual({
      type: 'pending',
    });
  });

  it('ignores `to=functions.` in prose, without the commentary channel', () => {
    const text = 'The model wrote to=functions.load_skill json{"skill":"x"} in its answer.';

    expect(findHarmonyToolCall(text)).toEqual({ type: 'none' });
  });

  it('ignores a call to a tool the request did not declare', () => {
    const text = 'assistantcommentary to=functions.delete_index json{"index":"x"}';

    expect(findHarmonyToolCall(text, 0, { declaredToolNames: ['load_skill'] })).toEqual({
      type: 'none',
    });
    expect(findHarmonyToolCall(text, 0, { declaredToolNames: ['delete_index'] })).toMatchObject({
      type: 'call',
      call: { name: 'delete_index' },
    });
  });

  it('keeps waiting for a declared name that is still streaming in', () => {
    expect(
      findHarmonyToolCall('assistantcommentary to=functions.load_sk', 0, {
        declaredToolNames: ['load_skill'],
      })
    ).toEqual({ type: 'pending' });
  });

  it('ignores a call whose arguments are not a JSON object', () => {
    expect(
      findHarmonyToolCall('assistantcommentary to=functions.load_skill json not-json')
    ).toEqual({ type: 'none' });
  });

  it('reports pending while the arguments are still streaming in', () => {
    expect(
      findHarmonyToolCall('assistantcommentary to=functions.load_skill json{"skill":{"name":"a')
    ).toEqual({ type: 'pending' });
  });

  it('exposes the holdback and flush bounds used by the stream operator', () => {
    // The longest prefix of a call that can arrive split across chunks: the
    // stripped form with the harmony markers of the unstripped one in front.
    const longestSplitPrefix = '<|start|>assistant<|channel|>commentary to=functions.';
    expect(longestSplitPrefix).toHaveLength(53);
    expect(HARMONY_TOOL_CALL_HOLD).toBeGreaterThanOrEqual(longestSplitPrefix.length);
    expect(MAX_HARMONY_TOOL_CALL_LENGTH).toBeGreaterThan(HARMONY_TOOL_CALL_HOLD);
  });
});

describe('findUnrecoveredHarmonyCallNames', () => {
  it('names every commentary call still in the content, declared or not', () => {
    const text =
      'analysisreasoning first.' +
      'assistantcommentary to=functions.security.attack-discovery.get_status json{\n  "execution_uuid": "abc"\n}' +
      'assistantcommentary to=functions.delete_index json{"index":"x"}';

    expect(findUnrecoveredHarmonyCallNames(text)).toEqual([
      'security.attack-discovery.get_status',
      'delete_index',
    ]);
  });

  it('reports a call whose recipient is not readable yet', () => {
    expect(findUnrecoveredHarmonyCallNames('assistantcommentary to=functions.')).toEqual([
      UNNAMED_HARMONY_TOOL_CALL,
    ]);
  });

  it('reports nothing for prose, reasoning or a non-JSON recipient', () => {
    expect(
      findUnrecoveredHarmonyCallNames(
        'The answer is in to=functions.load_skill json{"skill":"x"} and nothing else ran.'
      )
    ).toEqual([]);
    expect(findUnrecoveredHarmonyCallNames('analysisWe should call the tool now.')).toEqual([]);
  });
});
