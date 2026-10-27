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

// The recipe from the streams-config-distributor docs.
const hashPublishPayload = (unitYaml: string, credentials: UnitCredential[] = []): string => {
  const hash = createHash('sha256').update(unitYaml, 'utf8');
  if (credentials.length > 0) {
    const pairs = [...credentials]
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map(({ name, ciphertext }) => [name, ciphertext]);
    hash.update(`\n${JSON.stringify(pairs)}`, 'utf8');
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

    await expect(publish({ unitId: 'default', unit, credentials: [] })).rejects.toMatchObject({
      statusCode: 503,
    });
    await expect(validate({ unit, credentials: [] })).rejects.toMatchObject({
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

    await publish({ unitId: 'default', unit, credentials: [] });

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

  it('publishes the given credentials without sealing', async () => {
    const fetchImpl = okFetch();
    const credentials: UnitCredential[] = [
      { name: 'es-prod', ciphertext: 'cipher-es' },
      { name: 's3-archive', ciphertext: 'cipher-s3' },
    ];
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, credentials });

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({
      unit_yaml: expectedYaml,
      config_hash: hashPublishPayload(expectedYaml, credentials),
      credentials,
    });
  });

  it('hashes credentials per the distributor doc, sorted by name', async () => {
    const fetchImpl = okFetch();
    const sorted: UnitCredential[] = [
      { name: 'a-first', ciphertext: 'cipher-a' },
      { name: 'b-second', ciphertext: 'cipher-b' },
    ];
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, credentials: [...sorted].reverse() });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).config_hash).toBe(
      createHash('sha256')
        .update(`${expectedYaml}\n[["a-first","cipher-a"],["b-second","cipher-b"]]`, 'utf8')
        .digest('hex')
    );
  });

  it('keeps config_hash for the same credentials and changes it for a new ciphertext', async () => {
    const fetchImpl = okFetch();
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });
    const credentials = [{ name: 'es-prod', ciphertext: 'first-seal' }];

    await publish({ unitId: 'default', unit, credentials });
    await publish({ unitId: 'default', unit, credentials: [...credentials] });
    await publish({
      unitId: 'default',
      unit,
      credentials: [{ name: 'es-prod', ciphertext: 'second-seal' }],
    });

    const [first, second, third] = fetchImpl.mock.calls.map(
      ([, init]) => JSON.parse(init.body).config_hash
    );
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it('sends no credentials field and sha256(yaml) for a unit without secrets', async () => {
    const fetchImpl = okFetch();
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await publish({ unitId: 'default', unit, credentials: [] });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      unit_yaml: expectedYaml,
      config_hash: createHash('sha256').update(expectedYaml, 'utf8').digest('hex'),
    });
  });

  it('exposes the resolved target id', () => {
    const { resolveTargetId } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fallbackTargetId: 'abc',
      fetchImpl: okFetch(),
    });

    expect(resolveTargetId()).toBe('abc');
  });

  it('POSTs credentials to /v1/units/validate when the unit has them', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ valid: true, diagnostics: [] }),
    });
    const credentials: UnitCredential[] = [{ name: 'es-prod', ciphertext: 'v1.k.i.c' }];
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443/', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate({ unit, credentials })).resolves.toEqual({});

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      unit_yaml: expectedYaml,
      credentials,
    });
  });

  it('omits credentials from /v1/units/validate when there are none', async () => {
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

    await expect(validate({ unit, credentials: [] })).resolves.toEqual({});

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://distributor.example:8443/v1/units/validate',
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

    await expect(validate({ unit, credentials: [] })).resolves.toEqual({
      compiled_config: 'receivers: {}',
    });
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

    await expect(validate({ unit, credentials: [] })).rejects.toMatchObject({
      message: 'OTTL parse error',
      statusCode: 400,
      data: { valid: false, diagnostics },
    });
  });

  it('retries validate at the pre-rename path when the distributor answers 405', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405, text: async () => 'Method Not Allowed' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ valid: true, diagnostics: [] }),
      });
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate({ unit, credentials: [] })).resolves.toEqual({});

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://distributor.example:8443/v1/units/validate',
      'https://distributor.example:8443/v1/validate',
    ]);
    expect(fetchImpl.mock.calls[1][1].body).toBe(fetchImpl.mock.calls[0][1].body);
  });

  it('does not retry validate on a 404', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404, text: async () => 'Not Found' });
    const { validate } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(validate({ unit, credentials: [] })).rejects.toMatchObject({ statusCode: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-flight request when the caller signal aborts', async () => {
    const callerController = new AbortController();
    const fetchImpl = jest.fn(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('This operation was aborted')));
          callerController.abort();
        })
    );
    const { publish } = createConfigDistributorClient({
      config: { url: 'https://distributor.example:8443', ssl: {} },
      logger: loggerMock.create(),
      fetchImpl,
    });

    await expect(
      publish({ unitId: 'default', unit, credentials: [], signal: callerController.signal })
    ).rejects.toMatchObject({
      message: expect.stringContaining('This operation was aborted'),
      statusCode: 502,
    });
  });
});
