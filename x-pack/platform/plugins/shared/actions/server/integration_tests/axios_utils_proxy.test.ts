/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as proxy from 'proxy';

import { readFileSync as fsReadFileSync } from 'fs';
import { resolve as pathResolve, join as pathJoin } from 'path';
import http from 'http';
import https from 'https';
import axios from 'axios';
import { duration as momentDuration } from 'moment';
import getPort from 'get-port';

import { request } from '../lib/axios_utils';
import { ByteSizeValue } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createReadySignal } from '@kbn/event-log-plugin/server/lib/ready_signal';
import { ActionsConfig, DEFAULT_USAGE_API_URL } from '../config';
import { ActionsConfigurationUtilities, getActionsConfigurationUtilities } from '../actions_config';
import { resolveCustomHosts } from '../lib/custom_host_settings';
import {
  DEFAULT_MICROSOFT_GRAPH_API_URL,
  DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
  DEFAULT_MICROSOFT_EXCHANGE_URL,
} from '../../common';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const CERT_DIR = '../../../../../../../../packages/kbn-dev-utils/certs';

const KIBANA_CRT_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.crt'));
const KIBANA_KEY_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.key'));
const CA_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'ca.crt'));

const KIBANA_KEY = fsReadFileSync(KIBANA_KEY_FILE, 'utf8');
const KIBANA_CRT = fsReadFileSync(KIBANA_CRT_FILE, 'utf8');
const CA = fsReadFileSync(CA_FILE, 'utf8');

const Auth = 'elastic:changeme';
const AuthB64 = Buffer.from(Auth).toString('base64');

const ServerResponse = 'A unique response returned by the server!';

describe('axios connections', () => {
  let testServer: http.Server | https.Server | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedAxiosDefaultsAdapter: any;

  beforeEach(() => {
    // needed to prevent the dreaded Error: Cross origin http://localhost forbidden
    // see: https://github.com/axios/axios/issues/1754#issuecomment-572778305
    savedAxiosDefaultsAdapter = axios.defaults.adapter;
    axios.defaults.adapter = 'http';
  });

  afterEach(() => {
    axios.defaults.adapter = savedAxiosDefaultsAdapter;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    testServer?.close();
    testServer = null;
  });

  describe('http', () => {
    test('it works', async () => {
      const { url, server } = await createServer({ useHttps: false });
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });
  });

  describe('https', () => {
    test('it fails with self-signed cert and no overrides', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with verificationMode "none" config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        ssl: {
          verificationMode: 'none',
        },
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });

    test('it works with verificationMode "none" for custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { verificationMode: 'none' } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });

    test('it works with ca in custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: CA } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });

    test('it fails with incorrect ca in custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: KIBANA_CRT } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with incorrect ca in custom host config but verificationMode "none"', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA,
              verificationMode: 'none',
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });

    test('it works with incorrect ca in custom host config but verificationMode config "full"', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        ssl: {
          verificationMode: 'none',
        },
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA,
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
      expect(res.data).toBe(ServerResponse);
    });

    test('it fails with no matching custom host settings', async () => {
      const { url, server } = await createServer({ useHttps: true });
      const otherUrl = 'https://example.com';
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url: otherUrl, ssl: { verificationMode: 'none' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 1', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: 'garbage' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 2', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const ca = '-----BEGIN CERTIFICATE-----\ngarbage\n-----END CERTIFICATE-----\n';
      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: ca } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });
  });

  // targetHttps, proxyHttps, and proxyAuth should all range over [false, true], but
  // currently the true versions are not passing
  describe(`proxy`, () => {
    for (const targetHttps of [false]) {
      for (const targetAuth of [false, true]) {
        for (const proxyHttps of [false]) {
          for (const proxyAuth of [false]) {
            const targetLabel = testLabel('target', targetHttps, targetAuth);
            const proxyLabel = testLabel('proxy', proxyHttps, proxyAuth);
            const testName = `${targetLabel} :: ${proxyLabel}`;

            const opts = { targetHttps, targetAuth, proxyHttps, proxyAuth };

            test(`basic;                     ${testName}`, async () => await basicProxyTest(opts));

            if (targetAuth) {
              test(`wrong target password;     ${testName}`, async () =>
                await wrongTargetPasswordProxyTest(opts));

              test(`missing target password;   ${testName}`, async () =>
                await missingTargetPasswordProxyTest(opts));
            }

            if (proxyAuth) {
              test(`wrong proxy password;      ${testName}`, async () =>
                await wrongProxyPasswordProxyTest(opts));

              test(`missing proxy password;    ${testName}`, async () =>
                await missingProxyPasswordProxyTest(opts));
            }

            if (targetHttps) {
              test(`missing CA;                ${testName}`, async () =>
                await missingCaProxyTest(opts));

              test(`rejectUnauthorized target; ${testName}`, async () =>
                await rejectUnauthorizedTargetProxyTest(opts));

              test(`custom CA target;          ${testName}`, async () =>
                await customCAProxyTest(opts));

              test(`verModeNone target;        ${testName}`, async () =>
                await verModeNoneTargetProxyTest(opts));
            }
          }
        }
      }
    }
  });
});

async function basicProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      ssl: { verificationMode: 'none' },
      customHostSettings: [{ url: target.url, ssl: { certificateAuthoritiesData: CA } }],
    });

    const res = await request({ ...axiosDefaults, configurationUtilities: acu });
    expect(res.status).toBe(200);
    expect(res.data).toBe(ServerResponse);
  });
}

async function wrongTargetPasswordProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      ssl: { verificationMode: 'none' },
      customHostSettings: [{ url: target.url, ssl: { certificateAuthoritiesData: CA } }],
    });

    const wrongUrl = manglePassword(target.url);
    const res = await request({ ...axiosDefaults, url: wrongUrl, configurationUtilities: acu });
    expect(res.status).toBe(403);
  });
}

async function missingTargetPasswordProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      ssl: { verificationMode: 'none' },
      customHostSettings: [{ url: target.url, ssl: { certificateAuthoritiesData: CA } }],
    });

    const anonUrl = removePassword(target.url);
    const res = await request({ ...axiosDefaults, url: anonUrl, configurationUtilities: acu });
    expect(res.status).toBe(401);
  });
}

async function wrongProxyPasswordProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const wrongUrl = manglePassword(proxyInstance.url);
    const acu = getACUfromConfig({
      proxyUrl: wrongUrl,
      ssl: { verificationMode: 'none' },
    });

    try {
      await request({ ...axiosDefaults, configurationUtilities: acu });
      expect('request should have thrown error').toBeUndefined();
    } catch (err) {
      expect(err.message).toMatch('407');
    }
  });
}

async function missingProxyPasswordProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const anonUrl = removePassword(proxyInstance.url);
    const acu = getACUfromConfig({
      proxyUrl: anonUrl,
      ssl: { verificationMode: 'none' },
    });

    try {
      await request({ ...axiosDefaults, configurationUtilities: acu });
      expect('request should have thrown error').toBeUndefined();
    } catch (err) {
      expect(err.message).toMatch('407');
    }
  });
}

async function missingCaProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
    });

    try {
      await request({ ...axiosDefaults, configurationUtilities: acu });
      expect('request should have thrown error').toBeUndefined();
    } catch (err) {
      expect(err.code).toEqual('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    }
  });
}

async function rejectUnauthorizedTargetProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      customHostSettings: [{ url: target.url, ssl: { verificationMode: 'none' } }],
    });

    const res = await request({ ...axiosDefaults, configurationUtilities: acu });
    expect(res.status).toBe(200);
    expect(res.data).toBe(ServerResponse);
  });
}

async function customCAProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      customHostSettings: [{ url: target.url, ssl: { certificateAuthoritiesData: CA } }],
    });

    const res = await request({ ...axiosDefaults, configurationUtilities: acu });
    expect(res.status).toBe(200);
    expect(res.data).toBe(ServerResponse);
  });
}

async function verModeNoneTargetProxyTest(opts: RunTestOptions) {
  await runWithSetup(opts, async (target, proxyInstance, axiosDefaults) => {
    const acu = getACUfromConfig({
      proxyUrl: proxyInstance.url,
      customHostSettings: [{ url: target.url, ssl: { verificationMode: 'none' } }],
    });

    const res = await request({ ...axiosDefaults, configurationUtilities: acu });
    expect(res.status).toBe(200);
    expect(res.data).toBe(ServerResponse);
  });
}

interface RunTestOptions {
  targetHttps: boolean;
  targetAuth: boolean;
  proxyHttps: boolean;
  proxyAuth: boolean;
}

type AxiosParams = Parameters<typeof request>[0];

type Test = (
  target: CreateServerResult,
  proxy: CreateProxyResult,
  axiosDefaults: AxiosParams
) => Promise<void>;

async function runWithSetup(opts: RunTestOptions, fn: Test) {
  const target = await createServer({
    useHttps: opts.targetHttps,
    requireAuth: opts.targetAuth,
  });

  const proxyInstance = await createProxy({
    useHttps: opts.proxyHttps,
    requireAuth: opts.proxyAuth,
  });

  const axiosDefaults = {
    axios,
    logger,
    validateStatus,
    url: target.url,
    configurationUtilities: getACUfromConfig({
      proxyUrl: proxyInstance.url,
    }),
  };

  try {
    await fn(target, proxyInstance, axiosDefaults);
  } catch (err) {
    expect(err).toBeUndefined();
  }

  target.server.close();
  proxyInstance.server.close();
}

function testLabel(type: string, tls: boolean, auth: boolean) {
  return `${type} https ${tls ? 'X' : '-'} auth ${auth ? 'X' : '-'}`;
}

function validateStatus(status: number) {
  return true;
}

function manglePassword(url: string) {
  const parsed = new URL(url);
  parsed.password = `nope-${parsed.password}-nope`;
  return parsed.toString();
}

function removePassword(url: string) {
  const parsed = new URL(url);
  parsed.username = '';
  parsed.password = '';
  return parsed.toString();
}

const TlsOptions = {
  cert: KIBANA_CRT,
  key: KIBANA_KEY,
};

interface CreateServerOptions {
  useHttps: boolean;
  requireAuth?: boolean;
}

interface CreateServerResult {
  url: string;
  server: http.Server | https.Server;
}

async function createServer(options: CreateServerOptions): Promise<CreateServerResult> {
  const { useHttps, requireAuth = false } = options;
  const port = await getPort();
  const url = `http${useHttps ? 's' : ''}://${requireAuth ? `${Auth}@` : ''}localhost:${port}`;

  function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    if (requireAuth) {
      const auth = req.headers.authorization;
      if (auth == null) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.writeHead(401);
        res.end('authorization required');
        return;
      }
      if (auth !== `Basic ${AuthB64}`) {
        res.writeHead(403);
        res.end('not authorized');
        return;
      }
    }

    res.writeHead(200);
    res.end(ServerResponse);
  }

  let server: http.Server | https.Server;
  if (!useHttps) {
    server = http.createServer(requestHandler);
  } else {
    server = https.createServer(TlsOptions, requestHandler);
  }
  server.unref();

  const readySignal = createReadySignal<CreateServerResult>();
  server.listen(port, 'localhost', () => {
    readySignal.signal({ url, server });
  });

  return readySignal.wait();
}

interface CreateProxyOptions {
  useHttps: boolean;
  requireAuth?: boolean;
}

interface CreateProxyResult {
  url: string;
  server: http.Server | https.Server;
}

type AuthenticateCallback = (err: null | Error, authenticated: boolean) => void;

interface IAuthenticate {
  authenticate(req: http.IncomingMessage, callback: AuthenticateCallback): void;
}

async function createProxy(options: CreateProxyOptions): Promise<CreateProxyResult> {
  const { useHttps, requireAuth = false } = options;
  const port = await getPort();
  const url = getUrl(useHttps, requireAuth, port);
  let proxyServer: http.Server | https.Server;

  if (!useHttps) {
    proxyServer = http.createServer();
  } else {
    proxyServer = https.createServer(TlsOptions);
  }
  proxyServer.unref();

  proxy.createProxy(proxyServer);
  if (requireAuth) {
    (proxyServer as unknown as IAuthenticate).authenticate = (req, callback) => {
      const auth = req.headers['proxy-authorization'];
      callback(null, auth === `Basic ${AuthB64}`);
    };
  }

  const readySignal = createReadySignal<CreateProxyResult>();

  proxyServer.listen(port, 'localhost', () => {
    readySignal.signal({ server: proxyServer, url });
  });

  return readySignal.wait();
}

function getUrl(useHttps: boolean, requiresAuth: boolean, port: number) {
  return `http${useHttps ? 's' : ''}://${requiresAuth ? `${Auth}@` : ''}localhost:${port}`;
}

const BaseActionsConfig: ActionsConfig = {
  allowedHosts: ['*'],
  enabledActionTypes: ['*'],
  preconfiguredAlertHistoryEsIndex: false,
  preconfigured: {},
  proxyUrl: undefined,
  proxyHeaders: undefined,
  ssl: {
    proxyVerificationMode: 'full',
    verificationMode: 'full',
  },
  proxyBypassHosts: undefined,
  proxyOnlyHosts: undefined,
  maxResponseContentLength: ByteSizeValue.parse('1mb'),
  responseTimeout: momentDuration(1000 * 30),
  customHostSettings: undefined,
  enableFooterInEmail: true,
  microsoftGraphApiUrl: DEFAULT_MICROSOFT_GRAPH_API_URL,
  microsoftGraphApiScope: DEFAULT_MICROSOFT_GRAPH_API_SCOPE,
  microsoftExchangeUrl: DEFAULT_MICROSOFT_EXCHANGE_URL,
  usage: {
    url: DEFAULT_USAGE_API_URL,
  },
};

function getACUfromConfig(config: Partial<ActionsConfig> = {}): ActionsConfigurationUtilities {
  const resolvedConfig = resolveCustomHosts(logger, { ...BaseActionsConfig, ...config });
  return getActionsConfigurationUtilities(resolvedConfig);
}
