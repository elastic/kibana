/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Path from 'path';
import chalk from 'chalk';
import { mapValues } from 'lodash';
import { assertDockerAvailable } from '../util/assert_docker_available';
import { sparseCheckout } from '../util/sparse_checkout';
import { untilContainerReady } from '../util/until_container_ready';

const USER_EMAIL = 'kimchy@elasticsearch.com';
const USER_NAME = 'elastic';
const USER_PASSWORD = 'changeme';

const LOCAL_PUBLIC_KEY = 'langfuse-dev-public-key';
const LOCAL_SECRET_KEY = 'langfuse-dev-secret-key';

async function down(dockerComposeFilePath: string, cleanup: boolean = true) {
  await execa
    .command(`docker compose -f ${dockerComposeFilePath} down`, { cleanup })
    .catch(() => {});
}

export async function ensureLangfuse({ log, signal }: { log: ToolingLog; signal: AbortSignal }) {
  log.info(`Ensuring Langfuse is available`);

  await assertDockerAvailable();

  const repoDir = await sparseCheckout({
    repository: {
      user: 'langfuse',
      name: 'langfuse',
    },
    files: ['docker-compose.yml'],
  });

  const dockerComposeFilePath = Path.join(repoDir, 'docker-compose.yml');

  log.info(`Stopping existing containers`);

  await down(dockerComposeFilePath);

  log.debug(`Retrieved docker-compose file at ${dockerComposeFilePath}`);

  log.info(`Waiting until Langfuse is ready`);

  const env = mapValues(
    {
      LANGFUSE_INIT_USER_EMAIL: USER_EMAIL,
      LANGFUSE_INIT_USER_NAME: USER_NAME,
      LANGFUSE_INIT_USER_PASSWORD: USER_PASSWORD,
      LANGFUSE_INIT_PROJECT_PUBLIC_KEY: LOCAL_PUBLIC_KEY,
      LANGFUSE_INIT_PROJECT_SECRET_KEY: LOCAL_SECRET_KEY,
      LANGFUSE_BASE_URL: `http://localhost:3000`,
      LANGFUSE_INIT_ORG_ID: 'elastic',
      LANGFUSE_INIT_ORG_NAME: 'Elastic',
      LANGFUSE_INIT_PROJECT_ID: 'Elastic',
      LANGFUSE_INIT_PROJECT_NAME: 'Elastic',
    },
    (value, key) => {
      return process.env[key] || value;
    }
  );

  untilContainerReady({
    containerName: 'langfuse-web',
    dockerComposeFilePath,
    signal,
    log,
    condition: ['.State.Status', 'running'],
  })
    .then(async () => {
      log.write('');

      log.write(
        `${chalk.green(`✔`)} Langfuse started. Log in with ${env.LANGFUSE_INIT_USER_EMAIL}:${
          env.LANGFUSE_INIT_USER_PASSWORD
        } at ${
          env.LANGFUSE_BASE_URL
        }. Paste the following config in kibana.(dev.).yml if you don't already have Langfuse configured:`
      );

      const lines = [
        `telemetry.enabled: true`,
        `telemetry.tracing.enabled: true`,
        `xpack.inference.tracing.exporter.langfuse.base_url: "${env.LANGFUSE_BASE_URL}"`,
        `xpack.inference.tracing.exporter.langfuse.public_key: "${env.LANGFUSE_INIT_PROJECT_PUBLIC_KEY}"`,
        `xpack.inference.tracing.exporter.langfuse.secret_key: "${env.LANGFUSE_INIT_PROJECT_SECRET_KEY}"`,
      ];

      log.write('');

      lines.forEach((line) => {
        if (line) {
          log.write(line);
        }
      });
    })
    .catch((error) => {
      log.error(error);
    });

  await execa.command(`docker compose -f ${dockerComposeFilePath} up`, {
    stdio: 'inherit',
    cleanup: true,
    env,
  });
}
