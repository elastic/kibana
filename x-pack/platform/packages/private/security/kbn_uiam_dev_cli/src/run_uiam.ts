/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import execa from 'execa';
import { backOff } from 'exponential-backoff';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'os';

import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';
import { MOCK_IDP_UIAM_SHARED_SECRET, MOCK_IDP_UIAM_SIGNING_SECRET } from '@kbn/mock-idp-utils';
import type { ToolingLog } from '@kbn/tooling-log';

const ENV_DEFAULTS = {
  UIAM_API_PORT: '8080',
  UIAM_COSMOS_DB_GATEWAY_PORT: '8081',
  UIAM_COSMOS_DB_UI_PORT: '8082',
  // Taken from GitOps version file for UIAM service (dev env, services/uiam/versions.yaml)
  UIAM_GIT_REVISION: 'git-fb324ba1e88f',
  UIAM_LOGGING_LEVEL: 'INFO',
};

export async function runUiam({ log, signal }: { log: ToolingLog; signal: AbortSignal }) {
  log.info('Running UIAM services…');

  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);

  // Fill in environment variables with defaults.
  const env = Object.fromEntries(
    Object.entries(ENV_DEFAULTS).map(([key, value]) => [key, String(process.env[key] || value)])
  ) as typeof ENV_DEFAULTS;

  // Create a temporary Docker Compose file with the UIAM configuration.
  const dockerComposeFilePath = await createDockerComposeFile({ env });
  log.info(`Created Docker Compose file at ${dockerComposeFilePath}.`);

  log.info('Stopping existing containers…');
  await execa
    .command(`docker compose -f ${dockerComposeFilePath} down`, { cleanup: true })
    .catch(() => {});

  log.info('Waiting until UIAM container is ready…');
  untilContainerReady({
    containerName: 'uiam',
    dockerComposeFilePath,
    signal,
    log,
    condition: ['.State.Status', 'running'],
  })
    .then(async () => {
      log.write('');
      log.write(`${chalk.green(`✔`)} UIAM service started.`);
    })
    .catch((error: any) => log.error(error));

  await execa.command(`docker compose -f ${dockerComposeFilePath} up`, {
    stdio: 'inherit',
    cleanup: true,
    env,
  });
}

async function createDockerComposeFile({ env }: { env: typeof ENV_DEFAULTS }) {
  const entrypointScriptPath = path.join(__dirname, '..', 'scripts', 'run_java_with_custom_ca.sh');
  const initScriptPath = path.join(__dirname, '..', 'scripts', 'init_cosmosdb.sh');
  const dockerComposeContent = `
networks:
 default:
   name: elastic
   external: true

services:
  uiam-cosmosdb-gateway:
    image: mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview
    command: ["--protocol", "https", "--port", "8081"]
    ports:
      - ${env.UIAM_COSMOS_DB_GATEWAY_PORT}:8081 # Cosmos DB gateway
      - ${env.UIAM_COSMOS_DB_UI_PORT}:1234 # Cosmos DB emulator UI
      - ${env.UIAM_API_PORT}:8080 # UIAM Service API
    environment:
      - AZURE_COSMOS_EMULATOR_PARTITION_COUNT=1
      - AZURE_COSMOS_EMULATOR_ENABLE_DATA_PERSISTENCE=false
      - LOG_LEVEL=error
    healthcheck:
      test: ["CMD", "curl", "-sk", "https://127.0.0.1:8081/_explorer/healthcheck"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 20s

  uiam-cosmosdb-init:
    image: alpine:latest
    network_mode: "service:uiam-cosmosdb-gateway"
    depends_on:
      uiam-cosmosdb-gateway:
        condition: service_healthy
    volumes:
      - ${initScriptPath}:/init_cosmosdb.sh:ro
    entrypoint: ["/bin/sh", "-c", "apk add --no-cache curl openssl && /bin/sh /init_cosmosdb.sh https://127.0.0.1:${env.UIAM_COSMOS_DB_GATEWAY_PORT}"]
    restart: "no"

  uiam:
    image: docker.elastic.co/cloud-ci/uiam:${env.UIAM_GIT_REVISION}
    network_mode: "service:uiam-cosmosdb-gateway"
    depends_on:
      uiam-cosmosdb-gateway:
        condition: service_healthy
      uiam-cosmosdb-init:
        condition: service_completed_successfully
    volumes:
      - ${entrypointScriptPath}:/opt/jboss/container/java/run/run-java-with-custom-ca.sh
    entrypoint: /opt/jboss/container/java/run/run-java-with-custom-ca.sh
    environment:
      - quarkus.http.ssl.certificate.key-store-provider=JKS
      - quarkus.http.ssl.certificate.trust-store-provider=SUN
      - quarkus.log.category."co".level=${env.UIAM_LOGGING_LEVEL}
      - quarkus.log.category."io".level=${env.UIAM_LOGGING_LEVEL}
      - quarkus.log.category."org".level=${env.UIAM_LOGGING_LEVEL}
      - quarkus.log.console.json.enabled=false
      - quarkus.log.level=${env.UIAM_LOGGING_LEVEL}
      - quarkus.otel.sdk.disabled=true
      - quarkus.profile=dev
      - uiam.api_keys.decoder.prefixes=essu_dev
      - uiam.api_keys.encoder.prefix=essu_dev
      - uiam.cosmos.account.access_key=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
      - uiam.cosmos.account.endpoint=https://127.0.0.1:${env.UIAM_COSMOS_DB_GATEWAY_PORT}
      - uiam.cosmos.container.apikey=api-keys
      - uiam.cosmos.container.token_invalidation=token-invalidation
      - uiam.cosmos.container.users=users
      - uiam.cosmos.database=uiam-db
      - uiam.cosmos.gateway_connection_mode=true # needed in order to for UIAM to be able to work with Cosmos DB emulator
      - uiam.internal.shared.secrets=${MOCK_IDP_UIAM_SHARED_SECRET}
      - uiam.tokens.jwt.signature.secrets=${MOCK_IDP_UIAM_SIGNING_SECRET}
      - uiam.tokens.jwt.signing.secret=${MOCK_IDP_UIAM_SIGNING_SECRET}
`;

  // Create temp directory if it doesn't exist.
  const tmpDir = path.join(os.tmpdir(), 'kbn-uiam-dev');
  const dirExists = await fs
    .stat(tmpDir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!dirExists) {
    await fs.mkdir(tmpDir, { recursive: true });
  }

  // Write the docker-compose content and entrypoint scripts to the temp directory.
  const dockerComposeFilePath = path.join(tmpDir, 'docker-compose.yml');
  await fs.writeFile(dockerComposeFilePath, dockerComposeContent, 'utf8');

  return dockerComposeFilePath;
}

async function untilContainerReady({
  containerName,
  dockerComposeFilePath,
  signal,
  log,
  condition,
}: {
  containerName: string;
  dockerComposeFilePath: string;
  signal: AbortSignal;
  log: ToolingLog;
  condition: [string, string];
}) {
  async function isContainerReady() {
    log.debug(`Checking if "${containerName}" container is ready…`);
    const { stdout: globalScopeContainerName } = await execa.command(
      `docker compose -f ${dockerComposeFilePath} ps -q ${containerName}`
    );

    const [field, value] = condition;

    const { stdout } = await execa
      .command(`docker inspect --format='{{${field}}}' ${globalScopeContainerName}`)
      .catch((error) => {
        log.debug(`Error retrieving container status: ${error.stderr.split('\n')[0]}`);
        throw error;
      });

    log.debug(`Container status: ${stdout}`);

    if (stdout !== `'${value}'`) {
      throw new Error(`${containerName} not ${value}: ${stdout}`);
    }
  }

  return await backOff(isContainerReady, {
    delayFirstAttempt: true,
    startingDelay: 500,
    jitter: 'full',
    numOfAttempts: 20,
    retry: () => !signal.aborted,
  });
}
