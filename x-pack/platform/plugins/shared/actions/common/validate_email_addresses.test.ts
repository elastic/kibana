/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatedEmail } from './types';
import { InvalidEmailReason } from './types';
import {
  validateEmailAddressesAsAlwaysValid,
  validateEmailAddresses,
  invalidEmailsAsMessage,
  isAddressMatchingSomePattern,
} from './validate_email_addresses';

const AllowedDomains = ['elastic.co', 'dev.elastic.co', 'found.no'];
const Emails = [
  'bob@elastic.co',
  '"Dr Tom" <tom@elastic.co>',
  'jim@dev.elastic.co',
  'rex@found.no',
  'sal@alerting.dev.elastic.co',
  'nancy@example.com',
  '"Dr RFC 5322" <dr@rfc5322.org>',
  'totally invalid',
  '{{sneaky}}',
];

describe('validate_email_address', () => {
  test('validateEmailAddressesAsAlwaysValid()', () => {
    const emails = ['bob@example.com', 'invalid-email', ''];
    const validatedEmails = validateEmailAddressesAsAlwaysValid(emails);

    expect(validatedEmails).toMatchInlineSnapshot(`
      Array [
        Object {
          "address": "bob@example.com",
          "valid": true,
        },
        Object {
          "address": "invalid-email",
          "valid": true,
        },
        Object {
          "address": "",
          "valid": true,
        },
      ]
    `);
  });

  describe('validateEmailAddresses()', () => {
    test('with configured allowlist and no mustache filtering', () => {
      const result = validateEmailAddresses(AllowedDomains, Emails);
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "\\"Dr Tom\\" <tom@elastic.co>",
            "valid": true,
          },
          Object {
            "address": "jim@dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "rex@found.no",
            "valid": true,
          },
          Object {
            "address": "sal@alerting.dev.elastic.co",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "nancy@example.com",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "\\"Dr RFC 5322\\" <dr@rfc5322.org>",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "totally invalid",
            "reason": "invalid",
            "valid": false,
          },
          Object {
            "address": "{{sneaky}}",
            "reason": "invalid",
            "valid": false,
          },
        ]
      `);
    });

    test('with configured allowlist and mustache filtering', () => {
      const result = validateEmailAddresses(AllowedDomains, Emails, {
        treatMustacheTemplatesAsValid: true,
      });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "\\"Dr Tom\\" <tom@elastic.co>",
            "valid": true,
          },
          Object {
            "address": "jim@dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "rex@found.no",
            "valid": true,
          },
          Object {
            "address": "sal@alerting.dev.elastic.co",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "nancy@example.com",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "\\"Dr RFC 5322\\" <dr@rfc5322.org>",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "totally invalid",
            "reason": "invalid",
            "valid": false,
          },
          Object {
            "address": "{{sneaky}}",
            "valid": true,
          },
        ]
      `);
    });

    test('with no configured allowlist and no mustache filtering', () => {
      const result = validateEmailAddresses(null, Emails);
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "\\"Dr Tom\\" <tom@elastic.co>",
            "valid": true,
          },
          Object {
            "address": "jim@dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "rex@found.no",
            "valid": true,
          },
          Object {
            "address": "sal@alerting.dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "nancy@example.com",
            "valid": true,
          },
          Object {
            "address": "\\"Dr RFC 5322\\" <dr@rfc5322.org>",
            "valid": true,
          },
          Object {
            "address": "totally invalid",
            "reason": "invalid",
            "valid": false,
          },
          Object {
            "address": "{{sneaky}}",
            "reason": "invalid",
            "valid": false,
          },
        ]
      `);
    });

    test('with no configured allowlist and mustache filtering', () => {
      const result = validateEmailAddresses(null, Emails, { treatMustacheTemplatesAsValid: true });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "\\"Dr Tom\\" <tom@elastic.co>",
            "valid": true,
          },
          Object {
            "address": "jim@dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "rex@found.no",
            "valid": true,
          },
          Object {
            "address": "sal@alerting.dev.elastic.co",
            "valid": true,
          },
          Object {
            "address": "nancy@example.com",
            "valid": true,
          },
          Object {
            "address": "\\"Dr RFC 5322\\" <dr@rfc5322.org>",
            "valid": true,
          },
          Object {
            "address": "totally invalid",
            "reason": "invalid",
            "valid": false,
          },
          Object {
            "address": "{{sneaky}}",
            "valid": true,
          },
        ]
      `);
    });
  });

  it('should validate correctly when using email recipient allowlist config', async () => {
    const recipientAllowlist = ['admin-*@example.com', '*@mydomain.com', 'foo.*@test.com'];
    const testEmails = [
      'bob@elastic.co',
      'jim@somewhere.org',
      'not an email',
      'foo.bar@elastic.co',
      'user@mydomain.com',
      'admin-network@example.com',
      'foo.bar@test.com',
    ];

    const validated = validateEmailAddresses(null, testEmails, {}, recipientAllowlist);
    expect(validated).toMatchInlineSnapshot(`
      Array [
        Object {
          "address": "bob@elastic.co",
          "reason": "notAllowed",
          "valid": false,
        },
        Object {
          "address": "jim@somewhere.org",
          "reason": "notAllowed",
          "valid": false,
        },
        Object {
          "address": "not an email",
          "reason": "invalid",
          "valid": false,
        },
        Object {
          "address": "foo.bar@elastic.co",
          "reason": "notAllowed",
          "valid": false,
        },
        Object {
          "address": "user@mydomain.com",
          "valid": true,
        },
        Object {
          "address": "admin-network@example.com",
          "valid": true,
        },
        Object {
          "address": "foo.bar@test.com",
          "valid": true,
        },
      ]
    `);
  });

  it('should ignore the recipient allowlist when using the isSender option', async () => {
    const recipientAllowlist = ['admin-*@example.com', '*@mydomain.com', 'foo.*@test.com'];
    const testEmails = ['sender@foo.com', 'foo.bar@elastic.com'];

    const validated = validateEmailAddresses(
      null,
      testEmails,
      { isSender: true },
      recipientAllowlist
    );
    expect(validated).toEqual([
      {
        address: 'sender@foo.com',
        valid: true,
      },
      {
        address: 'foo.bar@elastic.com',
        valid: true,
      },
    ]);
  });

  const entriesGood: ValidatedEmail[] = [
    { address: 'a', valid: true },
    { address: 'b', valid: true },
  ];

  const entriesInvalid: ValidatedEmail[] = [
    { address: 'c', valid: false, reason: InvalidEmailReason.invalid },
    { address: 'd', valid: false, reason: InvalidEmailReason.invalid },
  ];

  const entriesNotAllowed: ValidatedEmail[] = [
    { address: 'e', valid: false, reason: InvalidEmailReason.notAllowed },
    { address: 'f', valid: false, reason: InvalidEmailReason.notAllowed },
  ];

  describe('invalidEmailsAsMessage()', () => {
    test('with all valid entries', () => {
      expect(invalidEmailsAsMessage(entriesGood)).toMatchInlineSnapshot(`undefined`);
      expect(invalidEmailsAsMessage([entriesGood[0]])).toMatchInlineSnapshot(`undefined`);
    });

    test('with some invalid entries', () => {
      let entries = entriesGood.concat(entriesInvalid);
      expect(invalidEmailsAsMessage(entries)).toMatchInlineSnapshot(`"not valid emails: c, d"`);

      entries = entriesGood.concat(entriesInvalid[0]);
      expect(invalidEmailsAsMessage(entries)).toMatchInlineSnapshot(`"not valid emails: c"`);
    });

    test('with some not allowed entries', () => {
      let entries = entriesGood.concat(entriesNotAllowed);
      expect(invalidEmailsAsMessage(entries)).toMatchInlineSnapshot(`"not allowed emails: e, f"`);

      entries = entriesGood.concat(entriesNotAllowed[0]);
      expect(invalidEmailsAsMessage(entries)).toMatchInlineSnapshot(`"not allowed emails: e"`);
    });

    test('with some invalid and not allowed entries', () => {
      const entries = entriesGood.concat(entriesInvalid).concat(entriesNotAllowed);
      expect(invalidEmailsAsMessage(entries)).toMatchInlineSnapshot(
        `"not valid emails: c, d; not allowed emails: e, f"`
      );
    });
  });

  test('isAddressMatchingSomePattern', () => {
    const patterns = ['*-list@example.com', '*@mydomain.com', 'foo.*@test.com'];
    const validEmails = [
      'dev-list@example.com',
      'sales-list@example.com',
      'users@mydomain.com',
      'execs@mydomain.com',
      'foo.bar@test.com',
    ];
    const invalidEmails = [
      'dev-group@example.com',
      'devs@example.com',
      'foo@bar.com',
      'users@sub.mydomain.com',
      'foobar@test.com',
    ];

    validEmails.forEach((email) => {
      expect(isAddressMatchingSomePattern(email, patterns)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(isAddressMatchingSomePattern(email, patterns)).toBe(false);
    });
  });
});
