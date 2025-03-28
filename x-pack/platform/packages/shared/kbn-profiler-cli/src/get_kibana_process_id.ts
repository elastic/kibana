/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import execa from 'execa';

export async function getKibanaProcessId({ port }: { port: number }) {
  const { stdout: output } = await execa.command(`lsof -ti :${port}`);
  const pid = parseInt(output.trim().split('\n')[0], 10);
  if (!pid) {
    throw new Error(`Kibana process id not found for port ${port}`);
  }
  return pid;
}
