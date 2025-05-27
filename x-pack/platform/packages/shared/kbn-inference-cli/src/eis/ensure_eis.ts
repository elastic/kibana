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
import { assertDockerAvailable } from '../util/assert_docker_available';
import { getDockerComposeYaml } from './get_docker_compose_yaml';
import { getEisGatewayConfig } from './get_eis_gateway_config';
import { DATA_DIR, writeFile } from '../util/file_utils';
import { getNginxConf } from './get_nginx_conf';
import { getEisCredentials } from './get_eis_credentials';
import { untilContainerReady } from '../util/until_container_ready';

const DOCKER_COMPOSE_FILE_PATH = Path.join(DATA_DIR, 'docker-compose.yaml');
const NGINX_CONF_FILE_PATH = Path.join(DATA_DIR, 'nginx.conf');

function getPreconfiguredConnectorConfig({ modelId }: { modelId: string }) {
  return `xpack.actions.preconfigured:
  elastic-llm:
    name: Elastic LLM
    actionTypeId: .inference
    exposeConfig: true
    config:
      provider: 'elastic'
      taskType: 'chat_completion'
      inferenceId: '.rainbow-sprinkles-elastic'
      providerConfig:
        model_id: '${modelId}'`;
}

async function down(cleanup: boolean = true) {
  await execa
    .command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} down`, { cleanup })
    .catch(() => {});
}

export async function ensureEis({ log, signal }: { log: ToolingLog; signal: AbortSignal }) {
  log.info(`Ensuring EIS is available`);

  await assertDockerAvailable();

  const credentials = await getEisCredentials({
    log,
    dockerComposeFilePath: DOCKER_COMPOSE_FILE_PATH,
  });

  log.debug(`Stopping existing containers`);

  await down();

  const eisGatewayConfig = await getEisGatewayConfig({
    credentials,
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

  untilContainerReady({
    containerName: 'gateway-proxy',
    signal,
    log,
    dockerComposeFilePath: DOCKER_COMPOSE_FILE_PATH,
    condition: ['.State.Health.Status', 'healthy'],
  })
    .then(() => {
      log.write('');

      log.write(
        `${chalk.green(
          `✔`
        )} EIS Gateway started. Start Elasticsearch with "-E xpack.inference.elastic.url=http://localhost:${
          eisGatewayConfig.ports[0]
        }" to connect`
      );

      log.write('');

      log.write(
        `${chalk.green(
          `📋`
        )} Paste the following config in kibana.(dev.).yml if you don't already have a connector:`
      );

      const lines = getPreconfiguredConnectorConfig({ modelId: eisGatewayConfig.model.id }).split(
        '\n'
      );

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

  await execa.command(`docker compose -f ${DOCKER_COMPOSE_FILE_PATH} up`, {
    stdio: 'inherit',
    cleanup: true,
  });
}
