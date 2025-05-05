/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { backOff } from 'exponential-backoff';
import execa from 'execa';

export async function untilGatewayReady({
  dockerComposeFilePath,
}: {
  dockerComposeFilePath: string;
}) {
  async function isGatewayReady() {
    const { stdout: gatewayProxyContainerName } = await execa.command(
      `docker compose -f ${dockerComposeFilePath} ps -q gateway-proxy`
    );

    const { stdout } = await execa.command(
      `docker inspect --format='{{.State.Health.Status}}' ${gatewayProxyContainerName}`
    );

    if (stdout !== "'healthy'") {
      throw new Error(`gateway-proxy not healthy: ${stdout}`);
    }
  }

  return await backOff(isGatewayReady, {
    delayFirstAttempt: true,
    startingDelay: 500,
    jitter: 'full',
    numOfAttempts: 20,
  });
}
