/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa, { ExecaError } from 'execa';

class DockerUnavailableError extends AggregateError {
  constructor(originalError: ExecaError) {
    super([originalError], `Docker is not available`);
  }
}

export async function assertDockerAvailable(): Promise<void> {
  await execa.command(`docker info`).catch((error: ExecaError) => {
    throw new DockerUnavailableError(error);
  });
}
