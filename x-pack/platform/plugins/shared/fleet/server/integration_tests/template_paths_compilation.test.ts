/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { PassThrough } from 'stream';

import archiver from 'archiver';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';

import { EPM_API_ROUTES, PACKAGE_POLICY_API_ROUTES, AGENT_POLICY_API_ROUTES } from '../constants';

import { getZipEntries, TEMPLATE_PATHS_FIXTURE } from './fixtures/template_paths_package';
import { waitForFleetSetup, getSupertestWithAdminUser } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

interface TestVars {
  hosts?: string[];
  paths?: string[];
}

async function createAndGetPackagePolicy(kbnServer: TestKibanaUtils, vars: TestVars = {}) {
  const { hosts = ['localhost'], paths = ['/var/log/test.log'] } = vars;

  const agentPolicyRes = await getSupertestWithAdminUser(
    kbnServer.root,
    'post',
    AGENT_POLICY_API_ROUTES.CREATE_PATTERN
  ).send({ name: `template-paths-test-${Date.now()}`, description: '', namespace: 'default' });
  if (agentPolicyRes.status !== 200 || !agentPolicyRes.body?.item?.id) {
    throw new Error(
      `Failed to create agent policy: ${agentPolicyRes.status} ${JSON.stringify(
        agentPolicyRes.body
      )}`
    );
  }

  const packagePolicyRes = await getSupertestWithAdminUser(
    kbnServer.root,
    'post',
    PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN
  ).send({
    name: `template-paths-test-${Date.now()}`,
    description: '',
    namespace: 'default',
    policy_id: agentPolicyRes.body.item.id,
    package: { name: TEMPLATE_PATHS_FIXTURE.pkgName, version: TEMPLATE_PATHS_FIXTURE.pkgVersion },
    inputs: [
      {
        type: 'log',
        enabled: true,
        streams: [
          {
            id: 'log-logs',
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: `${TEMPLATE_PATHS_FIXTURE.pkgName}.${TEMPLATE_PATHS_FIXTURE.dataStreamPath}`,
            },
            vars: { paths: { value: paths } },
          },
        ],
        vars: { hosts: { value: hosts } },
      },
    ],
  });
  if (packagePolicyRes.status !== 200 || !packagePolicyRes.body?.item?.id) {
    throw new Error(
      `Failed to create package policy: ${packagePolicyRes.status} ${JSON.stringify(
        packagePolicyRes.body
      )}`
    );
  }

  const getRes = await getSupertestWithAdminUser(
    kbnServer.root,
    'get',
    PACKAGE_POLICY_API_ROUTES.INFO_PATTERN.replace(
      '{packagePolicyId}',
      packagePolicyRes.body.item.id
    )
  ).send();
  if (getRes.status !== 200) {
    throw new Error(
      `Failed to get package policy: ${getRes.status} ${JSON.stringify(getRes.body)}`
    );
  }

  return getRes.body.item;
}

async function buildZipBuffer(): Promise<Buffer> {
  const pass = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(pass);
  for (const entry of getZipEntries()) {
    archive.append(
      typeof entry.content === 'string' ? Buffer.from(entry.content, 'utf8') : entry.content,
      { name: entry.name }
    );
  }
  archive.finalize();
  return Buffer.concat(await pass.toArray());
}

describe('Fleet template_paths compilation (integration)', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: { license: 'trial' },
        kbn: {},
      },
    });

    esServer = await startES();

    const root = createRootWithCorePlugins(
      {
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: { type: 'json' },
            },
          },
          loggers: [
            { name: 'root', appenders: ['file'] },
            { name: 'plugins.fleet', level: 'all' },
          ],
        },
      },
      { oss: false }
    );

    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    kbnServer = {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    };

    await waitForFleetSetup(kbnServer.root);

    const zipBuffer = await buildZipBuffer();
    const installRes = await getSupertestWithAdminUser(
      kbnServer.root,
      'post',
      EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN
    )
      .set('Content-Type', 'application/zip')
      .send(zipBuffer);
    if (installRes.status !== 200) {
      throw new Error(
        `Failed to install package: ${installRes.status} ${JSON.stringify(installRes.body)}`
      );
    }
  });

  afterAll(async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
    // Allow async operations (e.g. saved object cleanup) to settle before Jest tears down
    await new Promise((res) => setTimeout(res, 10000));
  });

  it('merges input and stream templates using vars from the policy', async () => {
    const policy = await createAndGetPackagePolicy(kbnServer, {
      hosts: ['localhost'],
      paths: ['/var/log/test.log'],
    });

    expect(policy.inputs).toHaveLength(1);
    const input = policy.inputs[0];
    expect(input.compiled_input).toEqual({
      hosts: ['localhost', 'remote'],
      timeout: '30s',
    });

    expect(input.streams).toHaveLength(1);
    const stream = input.streams[0];
    expect(stream.compiled_stream).toEqual({
      type: 'log',
      metricset: [TEMPLATE_PATHS_FIXTURE.dataStreamPath],
      paths: ['/var/log/test.log'],
      processors: [{ add_host: null }],
      config: { b: 2, c: 3 },
    });
  });
});
