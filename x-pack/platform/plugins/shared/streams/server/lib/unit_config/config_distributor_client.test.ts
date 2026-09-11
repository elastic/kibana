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
};

const expectedYaml = YAML.stringify(unit);

const hashPublishPayload = (unitYaml: string, credentials: UnitCredential[] = []): string => {
  const hash = createHash('sha256').update(unitYaml, 'utf8');
  if (credentials.length > 0) {
    hash.update('\n');
    hash.update(
      JSON.stringify(
        [...credentials]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(({ name, ciphertext }) => [name, ciphertext])
      )
    );
  }
  return hash.digest('hex');
};

describe('createConfigDistributorClient', () => {
  it('no-ops publish and validate when the distributor URL is not configured', async () => {
    const fetchImpl = jest.fn();
    const { publish, validate } = createConfigDistributorClient({
      config: { ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, secrets: {} });
    await validate(unit);

    expect(fetchImpl).not.toHaveBeenCalled();
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

  it('sends credentials as a sidecar after encrypting secrets under the project key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    const secrets = { es_api_key: 's3cret', s3_secret: 'bucket' };
    const credentials: UnitCredential[] = [
      { name: 'es_api_key', ciphertext: 'cipher-es' },
      { name: 's3_secret', ciphertext: 'cipher-s3' },
    ];
    const encryptCredentials = jest.fn().mockResolvedValue(credentials);
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
    expect(body.config_hash).toEqual(hashPublishPayload(expectedYaml, credentials));
  });

  it('refuses to publish secrets when project-key encryption is not configured', async () => {
    const fetchImpl = jest.fn();
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(
      publish({ unitId: 'default', unit, secrets: { es_api_key: 's3cret' } })
    ).rejects.toMatchObject({
      statusCode: 503,
    });
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

    await expect(validate(unit)).resolves.toBeUndefined();

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

    await expect(validate(unit)).resolves.toBeUndefined();
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
