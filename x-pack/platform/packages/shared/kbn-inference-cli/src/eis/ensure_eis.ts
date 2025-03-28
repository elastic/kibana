/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Path from 'path';
import { backOff } from 'exponential-backoff';
import chalk from 'chalk';
import { assertDockerAvailable } from './assert_docker_available';
import { getDockerComposeYaml } from './get_docker_compose_yaml';
import { getEisGatewayConfig } from './get_eis_gateway_config';
import { DATA_DIR, writeFile } from './file_utils';
import { getNginxConf } from './get_nginx_conf';
import { getBedrockConfig } from './get_bedrock_config';

const DOCKER_COMPOSE_FILE_PATH = Path.join(DATA_DIR, 'docker-compose.yaml');
const NGINX_CONF_FILE_PATH = Path.join(DATA_DIR, 'nginx.conf');

async function down(cleanup: boolean = true) {
  await execa
    .command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} down`, { cleanup })
    .catch(() => {});
}

export async function ensureEis({ log, signal }: { log: ToolingLog; signal: AbortSignal }) {
  log.info(`Ensuring EIS is available`);

  const aws = await getBedrockConfig({ log });

  log.debug(`Checking for Docker to be available`);

  await assertDockerAvailable();

  log.debug(`Stopping existing containers`);

  await down();

  const eisGatewayConfig = await getEisGatewayConfig({
    aws,
    log,
    signal,
  });

  const nginxConf = getNginxConf({ eisGatewayConfig });

  log.debug(`Wrote nginx config to ${NGINX_CONF_FILE_PATH}`);

  await writeFile(NGINX_CONF_FILE_PATH, nginxConf);

  const dockerComposeYaml = getDockerComposeYaml({
    config: {
      eisGateway: eisGatewayConfig,
      nginx: {
        file: NGINX_CONF_FILE_PATH,
      },
    },
  });

  await writeFile(DOCKER_COMPOSE_FILE_PATH, dockerComposeYaml);

  log.debug(`Wrote docker-compose file to ${DOCKER_COMPOSE_FILE_PATH}`);

  async function isGatewayReady() {
    const { stdout: gatewayProxyContainerName } = await execa.command(
      `docker compose -f ${DOCKER_COMPOSE_FILE_PATH} ps -q gateway-proxy`
    );

    const { stdout } = await execa.command(
      `docker inspect --format='{{.State.Health.Status}}' ${gatewayProxyContainerName}`
    );

    if (stdout !== "'healthy'") {
      throw new Error(`gateway-proxy not healthy: ${stdout}`);
    }
  }

  backOff(isGatewayReady, {
    delayFirstAttempt: true,
    startingDelay: 500,
    jitter: 'full',
    numOfAttempts: 20,
  })
    .then(() => {
      log.write(
        `${chalk.green(
          `✔`
        )} EIS Gateway started. Start Elasticsearch with "-E xpack.inference.elastic.url=http://localhost:${
          eisGatewayConfig.ports[0]
        }" to connect`
      );
    })
    .catch((error) => {
      log.error(error);
    });

  await execa.command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} up`, {
    stdio: 'inherit',
    cleanup: true,
  });
}
