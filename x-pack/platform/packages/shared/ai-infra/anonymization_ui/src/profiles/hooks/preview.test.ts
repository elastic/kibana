/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule, RegexRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
} from './field_rule_actions';
import {
  buildLocalPreviewDocument,
  buildLocalPreviewRows,
  getPreviewDisplayValue,
} from './preview';

const fieldRules: FieldRule[] = [
  { field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' },
  { field: 'event.action', allowed: true, anonymized: false },
  { field: 'user.email', allowed: false, anonymized: false },
];

const sampleDocument = {
  host: { name: 'edge-1' },
  event: { action: 'process_start' },
  user: { email: 'a@b.com' },
};

const regexRules: RegexRule[] = [
  {
    id: 'regex-email',
    type: 'regex',
    pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}',
    entityClass: 'EMAIL',
    enabled: true,
  },
];

describe('buildLocalPreviewRows', () => {
  it('builds preview rows without runtime API calls', () => {
    const rows = buildLocalPreviewRows({
      document: sampleDocument,
      fieldRules,
    });

    expect(rows).toEqual([
      {
        field: 'host.name',
        action: FIELD_RULE_ACTION_ANONYMIZE,
        originalValue: 'edge-1',
        anonymizedValue: '<HOST_NAME>',
      },
      {
        field: 'event.action',
        action: FIELD_RULE_ACTION_ALLOW,
        originalValue: 'process_start',
        anonymizedValue: 'process_start',
      },
      {
        field: 'user.email',
        action: FIELD_RULE_ACTION_DENY,
        originalValue: 'a@b.com',
        anonymizedValue: '[DENIED]',
      },
    ]);
  });

  it('applies enabled regex rules to allowed preview values', () => {
    const rows = buildLocalPreviewRows({
      document: sampleDocument,
      fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
      regexRules,
    });

    expect(rows).toEqual([
      {
        field: 'user.email',
        action: FIELD_RULE_ACTION_ALLOW,
        originalValue: 'a@b.com',
        anonymizedValue: '<EMAIL>',
      },
    ]);
  });

  it('switches representation via showAnonymizedValues toggle', () => {
    const row = {
      field: 'host.name',
      action: FIELD_RULE_ACTION_ANONYMIZE,
      originalValue: 'edge-1',
      anonymizedValue: '<HOST_NAME>',
    };

    expect(getPreviewDisplayValue({ row, showAnonymizedValues: false })).toBe('edge-1');
    expect(getPreviewDisplayValue({ row, showAnonymizedValues: true })).toBe('<HOST_NAME>');
  });

  it('keeps missing field values undefined instead of blank strings', () => {
    const rows = buildLocalPreviewRows({
      document: sampleDocument,
      fieldRules: [{ field: 'does.not.exist', allowed: true, anonymized: false }],
    });

    expect(rows).toEqual([
      {
        field: 'does.not.exist',
        action: FIELD_RULE_ACTION_ALLOW,
        originalValue: undefined,
        anonymizedValue: undefined,
      },
    ]);
  });

  it('resolves literal dotted keys before nested traversal', () => {
    const rows = buildLocalPreviewRows({
      document: {
        'oneDayBurnRate.goodEvents': 123,
        oneDayBurnRate: { goodEvents: 999 },
      },
      fieldRules: [{ field: 'oneDayBurnRate.goodEvents', allowed: true, anonymized: false }],
    });

    expect(rows).toEqual([
      {
        field: 'oneDayBurnRate.goodEvents',
        action: FIELD_RULE_ACTION_ALLOW,
        originalValue: 123,
        anonymizedValue: 123,
      },
    ]);
  });

  it('uses REDACTED token when anonymize rule has no entity class', () => {
    const rows = buildLocalPreviewRows({
      document: sampleDocument,
      fieldRules: [{ field: 'host.name', allowed: true, anonymized: true }],
    });

    expect(rows).toEqual([
      {
        field: 'host.name',
        action: FIELD_RULE_ACTION_ANONYMIZE,
        originalValue: 'edge-1',
        anonymizedValue: '<REDACTED>',
      },
    ]);
  });
});

describe('buildLocalPreviewDocument', () => {
  it('applies field policy actions to a local preview output', () => {
    const output = buildLocalPreviewDocument({
      document: sampleDocument,
      fieldRules,
    });

    expect(output).toEqual({
      host: { name: '<HOST_NAME>' },
      event: { action: 'process_start' },
      user: {},
    });
  });

  it('does not create new paths for missing fields', () => {
    const output = buildLocalPreviewDocument({
      document: sampleDocument,
      fieldRules: [{ field: 'foo.bar', allowed: false, anonymized: false }],
    });

    expect(output).toEqual(sampleDocument);
  });

  it('updates literal dotted keys in flattened documents', () => {
    const output = buildLocalPreviewDocument({
      document: {
        'oneDayBurnRate.goodEvents': 123,
      },
      fieldRules: [
        {
          field: 'oneDayBurnRate.goodEvents',
          allowed: true,
          anonymized: true,
          entityClass: 'RATE',
        },
      ],
    });

    expect(output).toEqual({
      'oneDayBurnRate.goodEvents': '<RATE>',
    });
  });

  it('removes denied literal dotted keys in flattened documents', () => {
    const output = buildLocalPreviewDocument({
      document: {
        'oneDayBurnRate.goodEvents': 123,
      },
      fieldRules: [
        {
          field: 'oneDayBurnRate.goodEvents',
          allowed: false,
          anonymized: false,
        },
      ],
    });

    expect(output).toEqual({});
  });

  it('applies enabled regex rules across document string fields', () => {
    const output = buildLocalPreviewDocument({
      document: {
        message: 'Contact a@b.com for details',
        user: { email: 'a@b.com' },
      },
      fieldRules: [{ field: 'user.email', allowed: true, anonymized: false }],
      regexRules,
    });

    expect(output).toEqual({
      message: 'Contact <EMAIL> for details',
      user: { email: '<EMAIL>' },
    });
  });

  it('ignores invalid regex patterns in preview transforms', () => {
    const output = buildLocalPreviewDocument({
      document: {
        message: 'Contact a@b.com for details',
      },
      fieldRules: [],
      regexRules: [
        {
          id: 'invalid-regex',
          type: 'regex',
          pattern: '([a-z',
          entityClass: 'BROKEN',
          enabled: true,
        },
      ],
    });

    expect(output).toEqual({
      message: 'Contact a@b.com for details',
    });
  });

  it('ignores disabled regex rules in preview transforms', () => {
    const output = buildLocalPreviewDocument({
      document: {
        message: 'Contact a@b.com for details',
      },
      fieldRules: [],
      regexRules: [
        {
          id: 'disabled-regex',
          type: 'regex',
          pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}',
          entityClass: 'EMAIL',
          enabled: false,
        },
      ],
    });

    expect(output).toEqual({
      message: 'Contact a@b.com for details',
    });
  });

  it('supports slash-delimited regex patterns and recursively transforms arrays', () => {
    const output = buildLocalPreviewDocument({
      document: {
        message: 'Contact A@B.COM and c@d.com',
        recipients: ['A@B.COM', { nested: 'c@d.com' }],
      },
      fieldRules: [],
      regexRules: [
        {
          id: 'slash-regex',
          type: 'regex',
          pattern: '/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/i',
          entityClass: 'EMAIL',
          enabled: true,
        },
      ],
    });

    expect(output).toEqual({
      message: 'Contact <EMAIL> and <EMAIL>',
      recipients: ['<EMAIL>', { nested: '<EMAIL>' }],
    });
  });
});
