/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInlineActionStep } from './inline_action_steps';
import { parseInlineParams } from './parse_inline_params';

const email = getInlineActionStep('email');
const slack = getInlineActionStep('slack2.sendMessage');

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

  describe('default templates', () => {
    it.each([
      [
        'email',
        email,
        email.paramsTemplate
          .replace('- ""', '- ops@example.com')
          .replace('subject: ""', 'subject: Alert'),
        'message',
      ],
      ['slack', slack, slack.paramsTemplate.replace('channel: ""', 'channel: C123'), 'text'],
    ])(
      'accepts the %s template once the user-supplied fields are filled in',
      (_, definition, params, bodyField) => {
        const result = parseInlineParams(definition, params);

        expect(result.errors).toEqual([]);
        expect(result.params?.[bodyField]).toContain('{{ alert.alert_url }}');
      }
    );
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
    ])('reports %s as not a map', (_, params) => {
      expect(parseInlineParams(email, params).errors).toEqual([
        'Parameters must be a YAML map of field names to values.',
      ]);
    });
  });

  describe('schema errors', () => {
    it.each([
      ['the untouched email template', email, email.paramsTemplate, ['to', 'subject']],
      ['the untouched slack template', slack, slack.paramsTemplate, ['channel']],
      ['an empty map', email, '{}\n', ['to', 'subject', 'message']],
    ])('names every mandatory field of %s', (_, definition, params, fields) => {
      expect(parseInlineParams(definition, params).errors).toEqual(
        fields.map((field) => `'${field}' is required.`)
      );
    });

    it.each([
      [
        'a missing or null field',
        'to:\nsubject: Hi\n',
        ["'to' is required.", "'message' is required."],
      ],
      ['an empty list', 'to: []\nsubject: Hi\nmessage: Body\n', ["'to' is required."]],
      [
        'blank optional list entries (once)',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc: ["", " "]\n',
        ["'cc' must not contain empty values."],
      ],
      [
        'blank mandatory list entries (once)',
        'to: ["", " "]\nsubject: Hi\nmessage: Body\n',
        ["'to' is required."],
      ],
      [
        'an optional field without a value',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc:\n',
        ["'cc' must be a list of strings."],
      ],
      [
        'a string where a list is expected',
        'to: a@example.com\nsubject: Hi\nmessage: Body\n',
        ["'to' must be a list of strings."],
      ],
      [
        'a non-string list entry',
        'to: [a@b.com]\nsubject: Hi\nmessage: Body\ncc: [1]\n',
        ["'cc' must be a list of strings."],
      ],
      [
        'a list or number where a string is expected',
        'to: [a@b.com]\nsubject: [Hi]\nmessage: 5\n',
        ["'subject' must be a string.", "'message' must be a string."],
      ],
    ])('reports %s', (_, params, errors) => {
      expect(parseInlineParams(email, params).errors).toEqual(errors);
    });

    it('reports an unknown field', () => {
      expect(
        parseInlineParams(slack, 'channel: C123\ntext: Hello\nthreadTs: "1"\n').errors
      ).toEqual(["Unknown field: 'threadTs'."]);
    });

    it('quotes every unknown field', () => {
      expect(
        parseInlineParams(slack, 'channel: C123\ntext: Hello\nthreadTs: "1"\nblocks: []\n').errors
      ).toEqual(["Unknown fields: 'threadTs', 'blocks'."]);
    });

    it('does not return params when invalid', () => {
      expect(parseInlineParams(slack, 'channel: C123\n').params).toBeUndefined();
    });
  });
});
