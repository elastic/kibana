/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch as undiciFetch, Agent } from 'undici';

import {
  IacProvisionerConfigError,
  IacProvisionerRenderError,
  IacProvisionerUnavailableError,
} from '../errors';

import { appContextService } from './app_context';
import { iacProvisionerService, parseIacProvisionerErrors } from './iac_provisioner';

jest.mock('undici', () => ({
  fetch: jest.fn(),
  Agent: jest.fn().mockImplementation((opts) => ({ __agentOptions: opts })),
}));
jest.mock('./app_context');

jest.mock('@kbn/server-http-tools', () => ({
  ...jest.requireActual('@kbn/server-http-tools'),
  // rejectUnauthorized: false mirrors the real SslConfig default (it carries
  // server-side client-auth semantics) — the service must NOT propagate it to
  // the outbound Agent, so the Agent assertion below would catch it if it did.
  SslConfig: jest.fn().mockImplementation(({ certificate, key, certificateAuthorities }) => ({
    rejectUnauthorized: false,
    certificate,
    key,
    certificateAuthorities,
  })),
}));

const mockedFetch = jest.mocked(undiciFetch);
const mockedAgent = jest.mocked(Agent);

const RENDER_REQUEST = {
  provider: 'aws' as const,
  integrations: [
    {
      name: 'cloud_security_posture',
      version: '3.5.0',
      policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
    },
  ],
};

const ARTIFACT_URL = 'https://s3.example/rendered/xyz?X-Amz-Signature=SECRET';

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as any);

function mockConfig(overrides: Record<string, unknown> = {}) {
  jest.spyOn(appContextService, 'getConfig').mockReturnValue({
    agentless: { enabled: true },
    iacProvisioner: {
      enabled: true,
      api: {
        url: 'https://iac-provisioner.example',
        tls: { certificate: '/path/tls.crt', key: '/path/tls.key', ca: '/path/ca.crt' },
      },
      ...overrides,
    },
  } as any);
  jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
}

function mockLogger() {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    get: jest.fn(),
  };
  logger.get.mockReturnValue(logger);
  jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger as any);
  return logger;
}

describe('IacProvisionerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws IacProvisionerConfigError when the feature is not enabled', async () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: { enabled: true },
      iacProvisioner: { enabled: false },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockLogger();

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerConfigError
    );
  });

  it('throws IacProvisionerConfigError when the API url is missing', async () => {
    mockConfig({ api: undefined });
    mockLogger();

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerConfigError
    );
  });

  it('POSTs the render request with mTLS and returns the rendered artifact', async () => {
    mockConfig();
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    const result = await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    expect(result).toEqual({ artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' });
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://iac-provisioner.example/api/v1/render',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(RENDER_REQUEST),
      })
    );
    expect(mockedAgent).toHaveBeenCalledWith({
      connect: expect.objectContaining({
        cert: '/path/tls.crt',
        key: '/path/tls.key',
        ca: '/path/ca.crt',
        // Server certs must always be verified, regardless of what SslConfig
        // says — its rejectUnauthorized is a server-side client-auth setting.
        rejectUnauthorized: true,
        allowPartialTrustChain: true,
      }),
    });
  });

  it('supports CA-only TLS config, still verifying the server certificate', async () => {
    // Local dev: the provider doesn't verify clients, so no cert/key pair —
    // this must not throw IacProvisionerConfigError.
    mockConfig({
      api: { url: 'https://iac-provisioner.example', tls: { ca: '/path/ca.crt' } },
    });
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    const result = await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    expect(result).toEqual({ artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' });
    expect(mockedAgent).toHaveBeenCalledWith({
      connect: expect.objectContaining({
        cert: undefined,
        key: undefined,
        ca: '/path/ca.crt',
        rejectUnauthorized: true,
        allowPartialTrustChain: true,
      }),
    });
  });

  it('logs the request config at debug with TLS material redacted', async () => {
    mockConfig();
    const logger = mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    const debugLogged = logger.debug.mock.calls.flat().map(String).join(' ');
    // The full outbound request is visible: URL, body, timeout…
    expect(debugLogged).toContain('https://iac-provisioner.example/api/v1/render');
    expect(debugLogged).toContain('cloud_security_posture');
    expect(debugLogged).toContain('"timeoutMs":30000');
    // …but TLS entries only report presence, never their configured values.
    expect(debugLogged).toContain('"certificate":"REDACTED"');
    expect(debugLogged).toContain('"key":"REDACTED"');
    expect(debugLogged).toContain('"ca":"REDACTED"');
    expect(debugLogged).not.toContain('/path/tls.crt');
    expect(debugLogged).not.toContain('/path/tls.key');
    expect(debugLogged).not.toContain('/path/ca.crt');
    // The response side logs the expiry, never the artifact (also covered by
    // the artifactUrl sweep below).
    expect(debugLogged).toContain('artifact expires at 2026-07-28T12:00:00Z');
  });

  it('never logs the artifactUrl', async () => {
    mockConfig();
    const logger = mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    const allLogged = [
      ...logger.info.mock.calls,
      ...logger.error.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.debug.mock.calls,
    ]
      .flat()
      .map(String)
      .join(' ');
    expect(allLogged).not.toContain(ARTIFACT_URL);
    expect(allLogged).not.toContain('X-Amz-Signature');
  });

  it('maps a 422 response to IacProvisionerRenderError with the provider error codes', async () => {
    mockConfig();
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(422, { code: 'render.blueprint_not_found', message: 'blueprint not found' })
    );

    const promise = iacProvisionerService.renderTemplate(RENDER_REQUEST);
    await expect(promise).rejects.toThrow(IacProvisionerRenderError);
    await promise.catch((error: IacProvisionerRenderError) => {
      expect(error.statusCode).toBe(422);
      expect(error.errorCodes).toEqual(['render.blueprint_not_found']);
    });
  });

  it('maps a 5xx response to IacProvisionerUnavailableError', async () => {
    mockConfig();
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(500, { code: 'render.internal_error', message: 'boom' })
    );

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerUnavailableError
    );
  });

  it('maps a network failure to IacProvisionerUnavailableError', async () => {
    mockConfig();
    mockLogger();
    mockedFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerUnavailableError
    );
  });

  it('logs the TLS cause when undici wraps it as fetch failed', async () => {
    mockConfig();
    const logger = mockLogger();
    const failure = new TypeError('fetch failed');
    failure.cause = new Error('unable to get issuer certificate');
    mockedFetch.mockRejectedValueOnce(failure);

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerUnavailableError
    );
    const errorLogged = logger.error.mock.calls.flat().map(String).join(' ');
    expect(errorLogged).toContain('fetch failed');
    expect(errorLogged).toContain('unable to get issuer certificate');
  });

  it('does not replace Mozilla roots when tls.ca is unset', async () => {
    // ECH presents a client cert to the public proxy but must keep the default
    // CA store so Let's Encrypt on the hosted URL still verifies.
    mockConfig({
      api: {
        url: 'https://cloud-iac-provisioner.eu-west-1.aws.svc.qa.elastic.cloud',
        tls: {
          certificate: '/mnt/elastic-internal/http-certs/tls.crt',
          key: '/mnt/elastic-internal/http-certs/tls.key',
        },
      },
    });
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    expect(mockedAgent).toHaveBeenCalledWith({
      connect: expect.objectContaining({
        ca: undefined,
        rejectUnauthorized: true,
        allowPartialTrustChain: true,
      }),
    });
  });

  it('maps a body that fails to read to IacProvisionerUnavailableError', async () => {
    mockConfig();
    mockLogger();
    // Headers arrived (200) but the body stalls until the timeout aborts it —
    // the abort must cover the body read, not just the initial response.
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new DOMException('The operation was aborted.', 'AbortError');
      },
    } as any);

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerUnavailableError
    );
  });

  it('aborts the request after the render timeout and maps to IacProvisionerUnavailableError', async () => {
    jest.useFakeTimers();
    mockConfig();
    mockLogger();
    // fetch never settles on its own; it only rejects once the abort signal
    // fires — proving the RENDER_TIMEOUT_MS timer is what bounds the request.
    mockedFetch.mockImplementationOnce(
      (_url, opts: any) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })
    );

    const promise = iacProvisionerService.renderTemplate(RENDER_REQUEST);
    const assertion = expect(promise).rejects.toThrow(IacProvisionerUnavailableError);
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;
    jest.useRealTimers();
  });

  it('throws IacProvisionerConfigError when only the certificate is configured', async () => {
    // A half-configured pair must not silently downgrade to an
    // unauthenticated connection.
    mockConfig({
      api: {
        url: 'https://iac-provisioner.example',
        tls: { certificate: '/path/tls.crt', ca: '/path/ca.crt' },
      },
    });
    mockLogger();

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerConfigError
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('throws IacProvisionerConfigError when only the key is configured', async () => {
    // Symmetric to the certificate-only case: the other half of the pair
    // missing must fail just as loudly.
    mockConfig({
      api: {
        url: 'https://iac-provisioner.example',
        tls: { key: '/path/tls.key', ca: '/path/ca.crt' },
      },
    });
    mockLogger();

    await expect(iacProvisionerService.renderTemplate(RENDER_REQUEST)).rejects.toThrow(
      IacProvisionerConfigError
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('still verifies the server certificate when no TLS material is configured', async () => {
    // No cert/key/ca at all is a valid config (e.g. a provider fronted by a
    // public CA) — it must not throw and must keep rejectUnauthorized: true.
    mockConfig({
      api: { url: 'https://iac-provisioner.example', tls: undefined },
    });
    mockLogger();
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(200, { artifactUrl: ARTIFACT_URL, expiresAt: '2026-07-28T12:00:00Z' })
    );

    await iacProvisionerService.renderTemplate(RENDER_REQUEST);

    expect(mockedAgent).toHaveBeenCalledWith({
      connect: expect.objectContaining({
        cert: undefined,
        key: undefined,
        rejectUnauthorized: true,
        allowPartialTrustChain: true,
      }),
    });
  });
});

describe('parseIacProvisionerErrors', () => {
  it('parses the single { code, message } shape', () => {
    expect(parseIacProvisionerErrors({ code: 'render.conflict', message: 'conflict' })).toEqual([
      { code: 'render.conflict', message: 'conflict' },
    ]);
  });

  it('parses the MultiErrorResponse { errors: [...] } shape', () => {
    expect(
      parseIacProvisionerErrors({
        errors: [
          { code: 'render.conflict', message: 'a' },
          { code: 'render.protected_path', message: 'b' },
        ],
      })
    ).toEqual([
      { code: 'render.conflict', message: 'a' },
      { code: 'render.protected_path', message: 'b' },
    ]);
  });

  it('returns empty for unknown shapes', () => {
    expect(parseIacProvisionerErrors(undefined)).toEqual([]);
    expect(parseIacProvisionerErrors('nope')).toEqual([]);
    expect(parseIacProvisionerErrors({})).toEqual([]);
  });
});
