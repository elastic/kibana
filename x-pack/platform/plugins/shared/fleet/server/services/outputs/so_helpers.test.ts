/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output } from '../../../common/types';

import {
  patchUpdateDataWithRequireEncryptedAADFields,
  _getFieldsToIncludeEncryptedSO,
} from './so_helpers';

describe(`_getFieldsToIncludeEncryptedSO`, () => {
  it('should return the list of field included in AAD and encrypted fields', () => {
    expect(_getFieldsToIncludeEncryptedSO()).toMatchInlineSnapshot(`
      Array [
        "ssl",
        "password",
        "service_token",
        "shipper",
        "allow_edit",
        "broker_ack_reliability",
        "broker_buffer_size",
        "channel_buffer_size",
      ]
    `);
  });
});

describe('patchUpdateDataWithRequireEncryptedAADFields', () => {
  const ORIGINAL_LOGSTASH_OUTPUT = {
    type: 'logstash',
    allow_edit: ['hosts'],
    ssl: {
      certificate: 'testcertificate',
    },
    secrets: {
      ssl: {
        key: {
          id: 'secretref',
        },
      },
    },
  } as Output;

  const ORIGINAL_KAFKA_OUTPUT = {
    type: 'kafka',
    allow_edit: ['hosts'],
    password: 'testpassword',
    secrets: {
      password: {
        id: 'passwordref',
      },
    },
  } as Output;
  describe('With logstash output', () => {
    describe('when a included in AAD field is updated (allow_edit)', () => {
      it('it should include other AAD field and encrypted field if no new values are provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "ssl",
            ],
            "ssl": Object {
              "certificate": "testcertificate",
            },
          }
        `);
      });

      it('it update field with new values provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
          ssl: JSON.stringify({ certificate: 'testcertificateupdate' }),
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "ssl",
            ],
            "ssl": "{\\"certificate\\":\\"testcertificateupdate\\"}",
          }
        `);
      });
    });
  });

  describe('With kafka output', () => {
    describe('when a included in AAD field is updated (allow_edit)', () => {
      it('it should include other AAD field and encrypted field if no new values are provided', () => {
        const updateData = {
          allow_edit: ['password'],
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testpassword",
          }
        `);
      });

      it('it update fields with new values provided', () => {
        const updateData = {
          allow_edit: ['password'],
          password: 'testupdate',
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testupdate",
          }
        `);
      });
    });

    describe('when a secret is updated (password)', () => {
      it('it should include other AAD field and encrypted field if no new values are provided', () => {
        const updateData = {
          allow_edit: ['password'],
          password: 'testupdate',
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testupdate",
          }
        `);
      });

      it('it update fields with new values provided', () => {
        const updateData = {
          password: 'passwordupdate',
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "hosts",
            ],
            "password": "passwordupdate",
          }
        `);
      });
    });
  });

  describe('Changing a kafka output to logstash', () => {
    it('it should work', () => {
      const updateData = {
        ...ORIGINAL_LOGSTASH_OUTPUT,
        ssl: JSON.stringify(ORIGINAL_LOGSTASH_OUTPUT.ssl),
        //  Remove kafka field as done by the output service
        password: null,
      };

      patchUpdateDataWithRequireEncryptedAADFields(updateData as any, ORIGINAL_KAFKA_OUTPUT);
      expect(updateData).toMatchInlineSnapshot(`
        Object {
          "allow_edit": Array [
            "hosts",
          ],
          "password": null,
          "secrets": Object {
            "ssl": Object {
              "key": Object {
                "id": "secretref",
              },
            },
          },
          "ssl": "{\\"certificate\\":\\"testcertificate\\"}",
          "type": "logstash",
        }
      `);
    });
  });
});
