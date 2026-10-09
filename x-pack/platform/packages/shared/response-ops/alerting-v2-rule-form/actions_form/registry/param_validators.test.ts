/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isTemplateValue,
  validateEmailParams,
  validateRequiredText,
  validateSlackParams,
} from './param_validators';

const email = (params: Record<string, unknown>) =>
  validateEmailParams({ subject: 'Hi', message: 'Body', ...params });

describe('isTemplateValue', () => {
  it.each(['{{ inputs.payload.emails }}', '${{ consts.emails }}', '{% if x %}a{% endif %}'])(
    'is true for %s',
    (value) => {
      expect(isTemplateValue(value)).toBe(true);
    }
  );

  it.each(['user@example.com', 'prefix {{ x }}', 42, null, ['{{ x }}']])(
    'is false for %p',
    (value) => {
      expect(isTemplateValue(value)).toBe(false);
    }
  );
});

describe('validateRequiredText', () => {
  it('accepts a non-blank string', () => {
    expect(validateRequiredText({ text: 'hello' }, 'text')).toEqual([]);
  });

  it.each([
    ['missing', {}],
    ['null', { text: null }],
    ['blank', { text: '   ' }],
  ])('reports a %s value as required', (_, params) => {
    expect(validateRequiredText(params, 'text')).toEqual([
      { key: 'text', message: 'text is required.' },
    ]);
  });

  it.each([
    ['a number', 42],
    ['a boolean', true],
    // An unquoted `{{ x }}` parses as a YAML map
    ['an unquoted template', { '{ x }': null }],
  ])('asks to quote %s', (_, value) => {
    expect(validateRequiredText({ text: value }, 'text')).toEqual([
      { key: 'text', message: 'text must be a string. Wrap template expressions in quotes.' },
    ]);
  });
});

describe('validateEmailParams', () => {
  it('accepts a list of valid addresses', () => {
    expect(email({ to: ['user@example.com', 'Jane Doe <jane@example.com>'] })).toEqual([]);
  });

  it('accepts a whole template instead of the recipients list', () => {
    expect(email({ to: '{{ inputs.payload.emails }}' })).toEqual([]);
  });

  it('accepts templated entries', () => {
    expect(
      email({ to: ['{{ inputs.payload.owner }}', '{% if x %}a@example.com{% endif %}'] })
    ).toEqual([]);
  });

  it('accepts recipients in cc only, as long as `to` is a list', () => {
    expect(email({ to: [''], cc: ['user@example.com'] })).toEqual([]);
  });

  it.each([
    ['missing', {}],
    ['blank', { to: null }],
  ])('requires `to` when it is %s', (_, params) => {
    expect(email(params)).toEqual([{ key: 'to', message: 'to is required.' }]);
  });

  it('rejects a single address instead of a list', () => {
    expect(email({ to: 'user@example.com' })).toEqual([
      { key: 'to', message: 'to must be a list of email addresses.' },
    ]);
  });

  it('rejects a blank `cc` key', () => {
    expect(email({ to: ['user@example.com'], cc: null })).toEqual([
      { key: 'cc', message: 'cc must be a list of email addresses.' },
    ]);
  });

  it('asks to quote non-text entries', () => {
    expect(email({ to: [42, { '{ inputs.payload.owner }': null }] })).toEqual([
      { key: 'to', message: 'to entries must be strings. Wrap template expressions in quotes.' },
    ]);
  });

  it('requires at least one recipient', () => {
    expect(email({ to: ['', '  '] })).toEqual([
      { key: 'to', message: 'Add at least one recipient to to, cc, or bcc.' },
    ]);
  });

  it('lists invalid addresses per field', () => {
    expect(email({ to: ['user@example.com', 'me@'], bcc: ['nope'] })).toEqual([
      { key: 'to', message: 'to has invalid email addresses: me@.' },
      { key: 'bcc', message: 'bcc has invalid email addresses: nope.' },
    ]);
  });

  it('requires a subject and a message', () => {
    expect(validateEmailParams({ to: ['user@example.com'], subject: '', message: 7 })).toEqual([
      { key: 'subject', message: 'subject is required.' },
      { key: 'message', message: 'message must be a string. Wrap template expressions in quotes.' },
    ]);
  });

  it('ignores unknown params', () => {
    expect(email({ to: ['user@example.com'], messageHTML: null })).toEqual([]);
  });
});

describe('validateSlackParams', () => {
  it('accepts a channel and a text', () => {
    expect(validateSlackParams({ channel: 'general', text: 'hello' })).toEqual([]);
  });

  it('requires a channel and a text', () => {
    expect(validateSlackParams({ channel: '', text: 12 })).toEqual([
      { key: 'channel', message: 'channel is required.' },
      { key: 'text', message: 'text must be a string. Wrap template expressions in quotes.' },
    ]);
  });
});
