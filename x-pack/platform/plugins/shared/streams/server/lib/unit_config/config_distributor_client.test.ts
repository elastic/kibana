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
  it('answers 503 quietly without calling the distributor when the URL is not configured', async () => {
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
    // The plugin decides whether a missing URL is worth a warning; the client stays quiet.
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
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
        path: '/processors/0',
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

  it.each([401, 403])(
    'answers 502 when the distributor rejects the client certificate with %s',
    async (status) => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: false, status, text: async () => 'certificate rejected' });
      const { publish } = createConfigDistributorClient({
        config: { url: 'https://distributor.example:8443', ssl: {} },
        logger: loggerMock.create(),
        fetchImpl,
      });

      await expect(publish({ unitId: 'default', unit, credentials: [] })).rejects.toMatchObject({
        statusCode: 502,
      });
    }
  );

  describe('component catalogue', () => {
    const catalogue = {
      schema_version: 'v1',
      component_revision: 'sha256:revision',
      components: [],
      metadata: { schema_version: 'v1', enum_sets: {}, path_sets: {} },
      definitions: [],
    };
    const etagHeaders = (etag: string) => ({
      get: (name: string) => (name === 'etag' ? etag : null),
    });
    const createClient = (fetchImpl: jest.Mock) =>
      createConfigDistributorClient({
        config: { url: 'https://distributor.example:8443', ssl: {} },
        logger: loggerMock.create(),
        fetchImpl,
      });

    it('GETs the catalogue without a body and returns it with its ETag', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: etagHeaders('"sha256:body"'),
        text: async () => JSON.stringify(catalogue),
      });

      await expect(createClient(fetchImpl).fetchComponentCatalogue({})).resolves.toEqual({
        notModified: false,
        catalogue,
        etag: '"sha256:body"',
      });
      expect(fetchImpl).toHaveBeenCalledWith('https://distributor.example:8443/v1/components', {
        method: 'GET',
        headers: {},
        body: undefined,
        signal: expect.any(AbortSignal),
      });
    });

    it('revalidates with If-None-Match and reports a 304 as not modified', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 304, text: async () => '' });

      await expect(
        createClient(fetchImpl).fetchComponentCatalogue({ etag: '"sha256:body"' })
      ).resolves.toEqual({ notModified: true });
      expect(fetchImpl.mock.calls[0][1].headers).toEqual({ 'if-none-match': '"sha256:body"' });
    });

    it('answers 502 for a catalogue it cannot read', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ schema_version: 'v1', components: [] }),
      });

      await expect(createClient(fetchImpl).fetchComponentCatalogue({})).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it('answers 502 when the distributor rejects the client certificate', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 401, text: async () => 'no certificate' });

      await expect(createClient(fetchImpl).fetchComponentCatalogue({})).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it('answers 503 without calling the distributor when the URL is not configured', async () => {
      const fetchImpl = jest.fn();
      const { fetchComponentCatalogue, validateComponent } = createConfigDistributorClient({
        config: { ssl: {} },
        logger: loggerMock.create(),
        fetchImpl,
      });

      await expect(fetchComponentCatalogue({})).rejects.toMatchObject({ statusCode: 503 });
      await expect(
        validateComponent({
          kind: 'processor',
          component: { id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] },
        })
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('component validation', () => {
    const component = {
      id: 'tag',
      type: 'add_fields',
      supported_telemetry: ['logs' as const],
      config: [{ name: 'fields', value: [{ location: 'record', path: 'tier', action: 'upsert' }] }],
    };
    const createClient = (fetchImpl: jest.Mock) =>
      createConfigDistributorClient({
        config: { url: 'https://distributor.example:8443', ssl: {} },
        logger: loggerMock.create(),
        fetchImpl,
      });

    it('POSTs the component as YAML with its kind', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ valid: true, diagnostics: [] }),
      });

      await expect(
        createClient(fetchImpl).validateComponent({ kind: 'processor', component })
      ).resolves.toEqual({ valid: true, diagnostics: [] });
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://distributor.example:8443/v1/components/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ kind: 'processor', configuration: YAML.stringify(component) }),
        })
      );
    });

    it('returns the diagnostics of an invalid component instead of throwing', async () => {
      const diagnostics = [
        {
          severity: 'error',
          code: 'E028_INVALID_CONFIG_TYPE',
          message: 'action must be one of upsert, update, insert, delete',
          path: '/config/0/value/0/action',
          line: 7,
        },
      ];
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ valid: false, diagnostics }),
      });

      await expect(
        createClient(fetchImpl).validateComponent({ kind: 'processor', component })
      ).resolves.toEqual({ valid: false, diagnostics });
    });

    it('answers 502 when the distributor has no component validation route', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 404, text: async () => '404 page not found' });

      await expect(
        createClient(fetchImpl).validateComponent({ kind: 'processor', component })
      ).rejects.toMatchObject({ statusCode: 502 });
    });

    it('keeps a 413 and maps an unreadable 5xx to 502', async () => {
      const tooLarge = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 413, text: async () => 'too large' });
      const broken = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500, text: async () => 'internal error' });

      await expect(
        createClient(tooLarge).validateComponent({ kind: 'processor', component })
      ).rejects.toMatchObject({ statusCode: 413 });
      await expect(
        createClient(broken).validateComponent({ kind: 'processor', component })
      ).rejects.toMatchObject({ statusCode: 502 });
    });
  });
});
