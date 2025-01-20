/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNodeSSLOptions, getSSLSettingsFromConfig } from './get_node_ssl_options';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getNodeSSLOptions', () => {
  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode "full"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'full');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode "certificate"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'certificate');
    expect(nodeOption.checkServerIdentity).not.toBeNull();
    expect(nodeOption.rejectUnauthorized).toBeTruthy();
  });

  test('get node.js SSL options: rejectUnauthorized eql false for the verification mode "none"', () => {
    const nodeOption = getNodeSSLOptions(logger, 'none');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: false,
    });
  });

  test('get node.js SSL options: rejectUnauthorized eql true for the verification mode value which does not exist, the logger called with the proper warning message', () => {
    const nodeOption = getNodeSSLOptions(logger, 'notexist');
    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
          Array [
            Array [
              "Unknown ssl verificationMode: notexist",
            ],
          ]
      `);
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('appends SSL overrides', () => {
    const nodeOptionPFX = getNodeSSLOptions(logger, 'none', {
      pfx: Buffer.from("Hi i'm a pfx"),
      ca: Buffer.from("Hi i'm a ca"),
      passphrase: 'aaaaaaa',
    });
    expect(nodeOptionPFX).toMatchInlineSnapshot(`
      Object {
        "ca": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            97,
          ],
          "type": "Buffer",
        },
        "cert": undefined,
        "key": undefined,
        "passphrase": "aaaaaaa",
        "pfx": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            112,
            102,
            120,
          ],
          "type": "Buffer",
        },
        "rejectUnauthorized": false,
      }
    `);

    const nodeOptionCert = getNodeSSLOptions(logger, 'none', {
      cert: Buffer.from("Hi i'm a cert"),
      key: Buffer.from("Hi i'm a key"),
      ca: Buffer.from("Hi i'm a ca"),
      passphrase: 'aaaaaaa',
    });
    expect(nodeOptionCert).toMatchInlineSnapshot(`
      Object {
        "ca": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            97,
          ],
          "type": "Buffer",
        },
        "cert": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            99,
            101,
            114,
            116,
          ],
          "type": "Buffer",
        },
        "key": Object {
          "data": Array [
            72,
            105,
            32,
            105,
            39,
            109,
            32,
            97,
            32,
            107,
            101,
            121,
          ],
          "type": "Buffer",
        },
        "passphrase": "aaaaaaa",
        "pfx": undefined,
        "rejectUnauthorized": false,
      }
    `);
  });
});

describe('getSSLSettingsFromConfig', () => {
  test('get verificationMode eql "none" if legacy rejectUnauthorized eql false', () => {
    const nodeOption = getSSLSettingsFromConfig(undefined, false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'none',
    });
  });

  test('get verificationMode eql "none" if legacy rejectUnauthorized eql true', () => {
    const nodeOption = getSSLSettingsFromConfig(undefined, true);
    expect(nodeOption).toMatchObject({
      verificationMode: 'full',
    });
  });

  test('get verificationMode eql "certificate", ignore rejectUnauthorized', () => {
    const nodeOption = getSSLSettingsFromConfig('certificate', false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'certificate',
    });
  });
});
