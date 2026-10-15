/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import YAML from 'yaml';
import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsUnit } from '@kbn/streams-schema';
import { createConfigDistributorClient } from './config_distributor_client';
import type { UnitCredential } from './types';

const unit: StreamsUnit.Configuration = {
  sources: [
    {
      id: 'otlp-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'es-prod',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
  pipelines: [
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-prod'] },
      ],
    },
  ],
};

const expectedYaml = YAML.stringify(unit);

const hashPublishPayload = (unitYaml: string, fingerprint?: string): string => {
  const hash = createHash('sha256').update(unitYaml, 'utf8');
  if (fingerprint) {
    hash.update('\n');
    hash.update(fingerprint);
  }
  return hash.digest('hex');
};

const okFetch = () =>
  jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '',
  });

describe('createConfigDistributorClient', () => {
  it('logs an error and does not call the distributor when the URL is not configured', async () => {
    const fetchImpl = jest.fn();
    const logger = loggerMock.create();
    const { publish, validate } = createConfigDistributorClient({
      config: { ssl: {} },
      logger,
      fetchImpl,
    });

    await expect(publish({ unitId: 'default', unit, secrets: {} })).rejects.toMatchObject({
      statusCode: 503,
    });
    await expect(validate(unit)).rejects.toMatchObject({
      statusCode: 503,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('PUTs authored unit YAML and a SHA-256 config hash without mutating the unit', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443/', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, secrets: {} });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://distributor.example:8443/v1/units/default',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          unit_yaml: expectedYaml,
          config_hash: hashPublishPayload(expectedYaml),
        }),
      })
    );
  });

  it('sends sealed credentials as a sidecar and hashes the fingerprint', async () => {
    const fetchImpl = okFetch();
    const secrets = { es_api_key: 's3cret', s3_secret: 'bucket' };
    const credentials: UnitCredential[] = [
      { name: 'es_api_key', ciphertext: 'cipher-es' },
      { name: 's3_secret', ciphertext: 'cipher-s3' },
    ];
    const encryptCredentials = jest.fn().mockResolvedValue({ credentials, fingerprint: 'fp-1' });
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      hooks: { encryptCredentials },
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, secrets });

    expect(encryptCredentials).toHaveBeenCalledWith(secrets);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.unit_yaml).toEqual(expectedYaml);
    expect(body.credentials).toEqual(credentials);
    expect(body.config_hash).toEqual(hashPublishPayload(expectedYaml, 'fp-1'));
  });

  it('keeps config_hash stable when unchanged secrets are sealed to new ciphertext', async () => {
    const fetchImpl = okFetch();
    const encryptCredentials = jest
      .fn()
      .mockResolvedValueOnce({
        credentials: [{ name: 'es_api_key', ciphertext: 'first-seal' }],
        fingerprint: 'fp-same',
      })
      .mockResolvedValueOnce({
        credentials: [{ name: 'es_api_key', ciphertext: 'second-seal' }],
        fingerprint: 'fp-same',
      });
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      hooks: { encryptCredentials },
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, secrets: { es_api_key: 's3cret' } });
    await publish({ unitId: 'default', unit, secrets: { es_api_key: 's3cret' } });

    const [first, second] = fetchImpl.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(first.credentials).not.toEqual(second.credentials);
    expect(first.config_hash).toEqual(second.config_hash);
  });

  it('rejects with 503 and does not call the distributor when secrets exist but no encryption key is configured', async () => {
    const fetchImpl = okFetch();
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(
      publish({ unitId: 'default', unit, secrets: { es_api_key: 's3cret' } })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs unit YAML to /v1/validate without credentials', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ valid: true, diagnostics: [] }),
    });
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443/', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate(unit)).resolves.toEqual({});

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://distributor.example:8443/v1/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ unit_yaml: expectedYaml }),
      })
    );
  });

  it('accepts a valid unit that includes warning diagnostics', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          valid: true,
          diagnostics: [{ severity: 'warning', code: 'unused_field', message: 'field is unused' }],
          compiled_config: 'receivers: {}',
        }),
    });
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate(unit)).resolves.toEqual({ compiled_config: 'receivers: {}' });
  });

  it('rejects an invalid unit with distributor diagnostics', async () => {
    const diagnostics = [
      {
        severity: 'error',
        code: 'invalid_ottl',
        message: 'OTTL parse error',
        path: 'processors > add-env',
        line: 4,
      },
    ];
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ valid: false, diagnostics }),
    });
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate(unit)).rejects.toMatchObject({
      message: 'OTTL parse error',
      statusCode: 400,
      data: { valid: false, diagnostics },
    });
  });
});
