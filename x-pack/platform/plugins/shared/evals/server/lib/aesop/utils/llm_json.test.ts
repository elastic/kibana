/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractJsonCandidate, parseJsonFromLlmText, stripLlmWrappers } from './llm_json';

describe('stripLlmWrappers', () => {
  it('removes markdown code fences', () => {
    expect(stripLlmWrappers('```json\n{"a": 1}\n```')).toBe('{"a": 1}');
  });

  it('removes reasoning blocks', () => {
    expect(stripLlmWrappers(' thinkingthe user wants JSON</think>[{"a": 1}]')).toBe('[{"a": 1}]');
  });
});

describe('extractJsonCandidate', () => {
  it('stops at the end of the first balanced array instead of the last bracket in the text', () => {
    expect(extractJsonCandidate('[{"valid": 1}] Note: see [docs]', 'array')).toBe('[{"valid": 1}]');
  });

  it('stops at the end of the first balanced object', () => {
    expect(extractJsonCandidate('{"score": 0.9} Note: {braces} may follow', 'object')).toBe(
      '{"score": 0.9}'
    );
  });

  it('handles nested arrays', () => {
    expect(extractJsonCandidate('prose [[1, 2], [3]] trailing', 'array')).toBe('[[1, 2], [3]]');
  });

  it('ignores brackets that appear inside string literals', () => {
    expect(extractJsonCandidate('[{"query": "count ] of events"}]', 'array')).toBe(
      '[{"query": "count ] of events"}]'
    );
  });

  it('handles escaped quotes inside string literals', () => {
    expect(extractJsonCandidate('[{"note": "say \\"hi]\\" now"}]', 'array')).toBe(
      '[{"note": "say \\"hi]\\" now"}]'
    );
  });

  it('returns null when no complete pair exists', () => {
    expect(extractJsonCandidate('[{"a": 1}', 'array')).toBeNull();
    expect(extractJsonCandidate('no json at all', 'array')).toBeNull();
  });
});

describe('parseJsonFromLlmText', () => {
  it('parses a bare JSON array', () => {
    expect(parseJsonFromLlmText('[{"a": 1}]', 'array')).toEqual([{ a: 1 }]);
  });

  it('parses a JSON array followed by prose containing brackets', () => {
    expect(parseJsonFromLlmText('[{"valid": 1}] Note: see [docs]', 'array')).toEqual([
      { valid: 1 },
    ]);
  });

  it('parses a fenced JSON array preceded by prose', () => {
    expect(parseJsonFromLlmText('Here are the results:\n```json\n[{"a": 1}]\n```', 'array')).toEqual([
      { a: 1 },
    ]);
  });

  it('parses a JSON object followed by prose containing braces', () => {
    expect(
      parseJsonFromLlmText('Evaluation: {"score": 0.9} Note: placeholders like {this} exist', 'object')
    ).toEqual({ score: 0.9 });
  });

  it('returns null when the response carries no JSON', () => {
    expect(parseJsonFromLlmText('I could not evaluate this skill.', 'array')).toBeNull();
    expect(parseJsonFromLlmText('', 'object')).toBeNull();
  });
});
