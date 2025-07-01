/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { backOff } from 'exponential-backoff';
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';

export async function untilContainerReady({
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
    log.debug(`Checking container is ready`);
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
    retry: () => {
      return !signal.aborted;
    },
  });
}
