/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInlineActionStepDefinition } from '../registry';
import { parseInlineParams } from './parse_inline_params';

const email = getInlineActionStepDefinition('email');
const slack = getInlineActionStepDefinition('slack2.sendMessage');

if (!email || !slack) {
  throw new Error('Expected the email and slack2 step definitions to be registered.');
}

describe('parseInlineParams', () => {
  describe('valid params', () => {
    it('returns the parsed email params', () => {
      expect(
        parseInlineParams(
          email,
          'to:\n  - ops@example.com\nsubject: Alert\nmessage: "{{ inputs.payload.policyId }}"\ncc:\n  - cc@example.com\n'
        )
      ).toEqual({
        params: {
          to: ['ops@example.com'],
          subject: 'Alert',
          message: '{{ inputs.payload.policyId }}',
          cc: ['cc@example.com'],
        },
        errors: [],
      });
    });

    it('returns the parsed slack params', () => {
      expect(parseInlineParams(slack, 'channel: C123\ntext: Hello\n')).toEqual({
        params: { channel: 'C123', text: 'Hello' },
        errors: [],
      });
    });
  });

  describe('yaml errors', () => {
    it('reports malformed YAML with its location', () => {
      expect(parseInlineParams(email, 'to: "unterminated\n').errors).toEqual([
        'Invalid YAML: Missing closing "quote at line 2, column 1',
      ]);
    });

    it.each([
      ['empty params', ''],
      ['a list', '- a\n- b\n'],
      ['a scalar', 'hello\n'],
      ['an empty map', '{}\n'],
    ])('reports %s as not a map', (_, params) => {
      expect(parseInlineParams(email, params).errors).toEqual([
        'Parameters must be a YAML map of field names to values.',
      ]);
    });
  });

  describe('schema errors', () => {
    it('names every blank field of the untouched email template', () => {
      expect(parseInlineParams(email, email.paramsTemplate).errors).toEqual([
        "'to' is required.",
        "'subject' is required.",
        "'message' is required.",
      ]);
    });

    it('names every blank field of the untouched slack template', () => {
      expect(parseInlineParams(slack, slack.paramsTemplate).errors).toEqual([
        "'channel' is required.",
        "'text' is required.",
      ]);
    });

    it('reports missing and null fields as required', () => {
      expect(parseInlineParams(email, 'to:\nsubject: Hi\n').errors).toEqual([
        "'to' is required.",
        "'message' is required.",
      ]);
    });

    it('reports an empty list as required', () => {
      expect(parseInlineParams(email, 'to: []\nsubject: Hi\nmessage: Body\n').errors).toEqual([
        "'to' is required.",
      ]);
    });

    it('reports a blank optional list entry once', () => {
      expect(
        parseInlineParams(email, 'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc: ["", " "]\n')
          .errors
      ).toEqual(["'cc' is required."]);
    });

    it('reports a string where a list is expected', () => {
      expect(
        parseInlineParams(email, 'to: a@example.com\nsubject: Hi\nmessage: Body\n').errors
      ).toEqual(["'to' must be a list of strings."]);
    });

    it('reports a list or number where a string is expected', () => {
      expect(parseInlineParams(email, 'to: [a@b.com]\nsubject: [Hi]\nmessage: 5\n').errors).toEqual(
        ["'subject' must be a string.", "'message' must be a string."]
      );
    });

    it('reports unknown fields', () => {
      expect(
        parseInlineParams(slack, 'channel: C123\ntext: Hello\nthreadTs: "1"\nblocks: []\n').errors
      ).toEqual(["Unknown field: 'threadTs, blocks'."]);
    });

    it('does not return params when invalid', () => {
      expect(parseInlineParams(slack, 'channel: C123\n').params).toBeUndefined();
    });
  });
});
