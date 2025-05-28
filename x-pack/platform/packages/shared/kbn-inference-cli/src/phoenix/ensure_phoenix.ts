/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import execa from 'execa';
import { mapValues } from 'lodash';
import Os from 'os';
import Path from 'path';
import { assertDockerAvailable } from '../util/assert_docker_available';
import { createDirIfNotExists, writeFile } from '../util/file_utils';
import { untilContainerReady } from '../util/until_container_ready';
import { getDockerComposeYaml } from './get_docker_compose_yaml';

const PHOENIX_PORT = '6006';
const PHOENIX_HOST = '0.0.0.0';
const PHOENIX_ENABLE_AUTH = false;
const PHOENIX_SECRET = '';
const PHOENIX_LOGGING_MODE = 'default';
const PHOENIX_LOGGING_LEVEL = 'info';
const PHOENIX_DB_LOGGING_LEVEL = 'info';

async function down(dockerComposeFilePath: string, cleanup: boolean = true) {
  await execa
    .command(`docker compose -f ${dockerComposeFilePath} down`, { cleanup })
    .catch(() => {});
}

export async function ensurePhoenix({ log, signal }: { log: ToolingLog; signal: AbortSignal }) {
  log.info(`Ensuring Phoenix is available`);

  await assertDockerAvailable();

  const tmpDir = Path.join(Os.tmpdir(), 'kibana-inference', 'phoenix');

  await createDirIfNotExists(tmpDir);

  const dockerComposeFilePath = Path.join(tmpDir, 'docker-compose.yml');

  const env = mapValues(
    {
      PHOENIX_PORT,
      PHOENIX_HOST,
      PHOENIX_ENABLE_AUTH,
      PHOENIX_SECRET,
      PHOENIX_LOGGING_LEVEL,
      PHOENIX_DB_LOGGING_LEVEL,
      PHOENIX_LOGGING_MODE,
    },
    (value, key) => {
      return String(process.env[key] || value);
    }
  );

  await writeFile(
    dockerComposeFilePath,
    await getDockerComposeYaml({
      ports: {
        phoenix: Number(env.PHOENIX_PORT),
      },
      env,
    })
  );

  log.debug(`Wrote to ${dockerComposeFilePath}`);

  log.info(`Stopping existing containers`);

  await down(dockerComposeFilePath);

  log.debug(`Retrieved docker-compose file at ${dockerComposeFilePath}`);

  log.info(`Waiting until Phoenix is ready`);

  untilContainerReady({
    containerName: 'phoenix',
    dockerComposeFilePath,
    signal,
    log,
    condition: ['.State.Status', 'running'],
  })
    .then(async () => {
      log.write('');

      log.write(
        `${chalk.green(
          `✔`
        )} Phoenix started. Visit at ${`http://${env.PHOENIX_HOST}:${env.PHOENIX_PORT}`}. Paste the following config in kibana.(dev.).yml if you don't already have Phoenix configured:`
      );

      const lines = [
        `telemetry.enabled: true`,
        `telemetry.tracing.enabled: true`,
        `xpack.inference.tracing.exporter.phoenix.base_url: "http://${env.PHOENIX_HOST}:${env.PHOENIX_PORT}"`,
        `xpack.inference.tracing.exporter.phoenix.public_url: "http://${env.PHOENIX_HOST}:${env.PHOENIX_PORT}"`,
        ...(env.PHOENIX_SECRET
          ? [`xpack.inference.tracing.exporter.phoenix.secret: "${env.PHOENIX_SECRET}"`]
          : []),
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
