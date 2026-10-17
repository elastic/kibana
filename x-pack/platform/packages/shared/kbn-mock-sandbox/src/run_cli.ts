/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { relative, resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import { DockerCli } from './docker_cli';
import { DockerSandboxBackend } from './docker_sandbox_backend';
import { buildKibanaConfig, readPreviousAuthorization, writeKibanaConfig } from './kibana_config';
import type { LocalEsConnection } from './local_es_connector';
import { readEsUrlFromKibanaConfig, resolveLocalEsConnection } from './local_es_connector';
import { startMockSandboxServer } from './sandbox_api_server';
import { ensureCustomImage, ensureDefaultImage } from './sandbox_image';

const DEFAULT_PORT = 9090;
const DEFAULT_API_KEY = 'mock-sandbox';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const parsePort = (value: unknown): number => {
  const raw = optionalString(value);
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw createFlagError('--port must be a number between 1 and 65535');
  }
  return port;
};

/** Runs `node scripts/mock_sandbox.js`. */
export const runMockSandboxCli = (): void => {
  run(
    async ({ log, flags, addCleanupTask }) => {
      const port = parsePort(flags.port);
      const apiKey = optionalString(flags['api-key']) ?? DEFAULT_API_KEY;
      const kibanaConfigPath = resolve(
        REPO_ROOT,
        optionalString(flags['kibana-config']) ?? 'config/kibana.dev.yml'
      );
      const outputConfigPath = resolve(
        REPO_ROOT,
        optionalString(flags['write-config']) ?? 'config/kibana.mock_sandbox.yml'
      );

      const docker = await DockerCli.create();
      const customImage = optionalString(flags.image);
      const image = customImage
        ? await ensureCustomImage(docker, log, customImage)
        : await ensureDefaultImage(docker, log);

      const backend = new DockerSandboxBackend({ docker, image, log });
      if (!flags.keep) {
        addCleanupTask(() => {
          const removed = backend.removeAllContainersSync();
          log.info(`Removed ${removed} sandbox container(s)`);
        });
      }

      const server = await startMockSandboxServer({
        backend,
        log,
        port,
        apiKey,
        tls: { certificate: fs.readFileSync(KBN_CERT_PATH), key: fs.readFileSync(KBN_KEY_PATH) },
      });
      addCleanupTask(() => {
        void server.close();
      });

      let es: LocalEsConnection | undefined;
      if (flags['es-connector']) {
        es = await resolveLocalEsConnection({
          log,
          esUrl: optionalString(flags['es-url']) ?? readEsUrlFromKibanaConfig(kibanaConfigPath),
          username: optionalString(flags['es-username']) ?? 'elastic',
          password: optionalString(flags['es-password']) ?? 'changeme',
          previousAuthorization: readPreviousAuthorization(outputConfigPath),
        });
      }

      writeKibanaConfig(
        outputConfigPath,
        buildKibanaConfig({ port: server.port, apiKey, caCertPath: CA_CERT_PATH, es })
      );

      const configArgs = ['config/kibana.yml', kibanaConfigPath, outputConfigPath]
        .filter((path) => fs.existsSync(resolve(REPO_ROOT, path)))
        .map((path) => `-c ${relative(REPO_ROOT, resolve(REPO_ROOT, path))}`)
        .join(' ');

      log.success(`Mock sandbox listening on localhost:${server.port} (image ${image})`);
      log.info(`Wrote Kibana settings to ${relative(REPO_ROOT, outputConfigPath)}`);
      if (es) {
        log.info(
          `Sandbox connector "mock-sandbox-local-es" -> ${es.containerUrl} (set as Nightshift telemetry connector)`
        );
      }
      log.info(`Start Kibana with:\n\n  node scripts/kibana --dev ${configArgs} --no-dev-config\n`);
      log.info('Press Ctrl+C to stop and remove the sandbox containers.');

      await new Promise<never>(() => {});
    },
    {
      description: `
        Starts a local stand-in for sandbox-api: a TLS gRPC server that implements the
        sandbox.SandboxService RPCs Kibana uses, backed by one Docker container per
        conversation. Only needs Docker. Writes the matching Kibana settings, including a
        preconfigured connector for the local Elasticsearch, to config/kibana.mock_sandbox.yml.
      `,
      flags: {
        string: [
          'port',
          'image',
          'api-key',
          'es-url',
          'es-username',
          'es-password',
          'kibana-config',
          'write-config',
        ],
        boolean: ['keep', 'es-connector'],
        default: { 'es-connector': true },
        help: `
          --port              gRPC port (default ${DEFAULT_PORT})
          --image             Use this image instead of the built-in light image, e.g. one built
                              from Dockerfile.sandbox in elastic/sandbox-service
          --api-key           API key Kibana must send (default "${DEFAULT_API_KEY}")
          --keep              Keep sandbox containers on exit; they are reused on the next start
          --no-es-connector   Don't add the local Elasticsearch connector to the Kibana settings
          --es-url            Elasticsearch URL (default: elasticsearch.hosts from --kibana-config,
                              else http://localhost:9200)
          --es-username       User that mints the connector's API key (default "elastic")
          --es-password       Password for --es-username (default "changeme")
          --kibana-config     Kibana config to read elasticsearch.hosts from
                              (default config/kibana.dev.yml)
          --write-config      Where to write the Kibana settings
                              (default config/kibana.mock_sandbox.yml)
        `,
      },
    }
  );
};
