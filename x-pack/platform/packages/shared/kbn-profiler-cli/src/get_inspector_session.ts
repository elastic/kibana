/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import CDP from 'chrome-remote-interface';
import { Profiler } from 'inspector';

export async function getInspectorSession(): Promise<() => Promise<Profiler.Profile>> {
  // Connect to the remote inspector endpoint.
  const client = await CDP({ port: 9229 });

  // Enable and start CPU profiling.
  await client.Profiler.enable();
  await client.Profiler.start();

  return async () => {
    const { profile } = await client.Profiler.stop();

    await client.Profiler.disable();

    await client.close();

    return profile;
  };
}
