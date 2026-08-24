/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmJudgeConfig } from './types';
import { InvalidJudgeConfigError, validateJudgeConfig } from './validate_config';

const config = (overrides: Partial<LlmJudgeConfig> = {}): LlmJudgeConfig => ({
  prompt: 'Rate {{{agent_response}}}',
  system_prompt: 'Judge the response according to the supplied criteria.',
  evidence: ['response'],
  output: { scores: [{ name: 'tone', type: 'number' }] },
  ...overrides,
});

const expectRejection = (judge: LlmJudgeConfig, message: string | RegExp) => {
  expect(() => validateJudgeConfig(judge)).toThrow(InvalidJudgeConfigError);
  expect(() => validateJudgeConfig(judge)).toThrow(message);
};

describe('validateJudgeConfig', () => {
  it('accepts a judge whose prompt reads only what it declared', () => {
    expect(() =>
      validateJudgeConfig(
        config({
          prompt: '{{{user_query}}} {{{agent_response}}} {{{tool_calls}}} {{{expected}}}',
          evidence: ['input', 'response', 'steps'],
          reference_data_keys: ['expected'],
        })
      )
    ).not.toThrow();
  });

  describe('scores', () => {
    it('rejects two scores sharing a name, which would collide in the tool schema', () => {
      expectRejection(
        config({
          output: {
            scores: [
              { name: 'tone', type: 'number' },
              { name: 'tone', type: 'number' },
            ],
          },
        }),
        'Duplicate score name(s): tone'
      );
    });

    it('rejects a categorical score with nothing to choose from', () => {
      expectRejection(
        config({ output: { scores: [{ name: 'verdict', type: 'categorical' }] } }),
        'must declare at least one label'
      );
      expectRejection(
        config({ output: { scores: [{ name: 'verdict', type: 'categorical', labels: [] }] } }),
        'must declare at least one label'
      );
    });

    it('rejects a repeated label, which would leave one of them unreachable', () => {
      expectRejection(
        config({
          output: {
            scores: [
              {
                name: 'verdict',
                type: 'categorical',
                labels: [
                  { value: 'pass', score: 1 },
                  { value: 'pass', score: 0 },
                ],
              },
            ],
          },
        }),
        'duplicate label(s): pass'
      );
    });

    it('rejects labels on a numeric score, which reports a number instead', () => {
      expectRejection(
        config({
          output: {
            scores: [{ name: 'tone', type: 'number', labels: [{ value: 'pass', score: 1 }] }],
          },
        }),
        'is numeric and cannot declare labels'
      );
    });
  });

  describe('inputs', () => {
    it('rejects a judge that does not inspect any trace evidence', () => {
      expectRejection(
        config({ prompt: 'Always return pass.', evidence: [] }),
        'must require at least one trace evidence field'
      );
    });

    it('rejects evidence asked for twice', () => {
      expectRejection(
        config({ evidence: ['response', 'response'] }),
        'Duplicate evidence requirement(s): response'
      );
    });

    it('rejects a reference data key asked for twice', () => {
      expectRejection(
        config({
          prompt: '{{{expected}}}',
          reference_data_keys: ['expected', 'expected'],
        }),
        'Duplicate reference data key(s): expected'
      );
    });

    it('rejects a reference data key that would shadow a trace evidence variable', () => {
      expectRejection(
        config({ prompt: '{{{agent_response}}}', reference_data_keys: ['agent_response'] }),
        'reserved and cannot be used'
      );
    });

    it('rejects object prototype keys', () => {
      expectRejection(
        config({ prompt: 'Rate the response.', reference_data_keys: ['__proto__'] }),
        'reserved and cannot be used'
      );
    });
  });

  describe('templates', () => {
    it('rejects interpolation that would HTML-escape evidence', () => {
      expectRejection(
        config({ prompt: 'Rate {{agent_response}}' }),
        'uses HTML-escaped Mustache interpolation for "agent_response"'
      );
    });

    it('accepts both unescaped Mustache interpolation forms', () => {
      expect(() =>
        validateJudgeConfig(
          config({ prompt: 'Rate {{{agent_response}}} and {{& agent_response}}' })
        )
      ).not.toThrow();
    });

    it('rejects a prompt reading a variable the judge is never given', () => {
      expectRejection(
        config({ prompt: 'Compare {{{agent_response}}} with {{{expected}}}' }),
        '"expected", which the evaluator is not given'
      );
    });

    it('rejects a prompt reading evidence the judge did not declare', () => {
      expectRejection(
        config({ prompt: '{{{user_query}}}', evidence: ['response'] }),
        '"user_query", which the evaluator is not given'
      );
    });

    it('rejects a template that does not parse', () => {
      expectRejection(config({ prompt: 'Rate {{{agent_response}}' }), 'is not a valid template');
    });

    it('checks the system prompt too', () => {
      expectRejection(
        config({ system_prompt: 'You are grading {{{expected}}}' }),
        'The system_prompt references "expected"'
      );
    });

    it('counts a section tag as reading its variable', () => {
      expect(() =>
        validateJudgeConfig(
          config({
            prompt: '{{#expected}}Compare with {{{expected}}}{{/expected}}',
            reference_data_keys: ['expected'],
          })
        )
      ).not.toThrow();

      expectRejection(
        config({ prompt: '{{^missing}}No reference{{/missing}}' }),
        '"missing", which the evaluator is not given'
      );
    });

    it('accepts a prompt with no variables when evidence is still required', () => {
      expect(() => validateJudgeConfig(config({ prompt: 'Rate the trace.' }))).not.toThrow();
    });
  });
});
