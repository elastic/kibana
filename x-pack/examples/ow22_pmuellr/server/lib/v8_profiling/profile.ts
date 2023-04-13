/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Session } from './session';

// Start a new profile, resolves to a function to stop the profile and resolve
// the profile data.
export async function startProfiling(session: Session, interval: number): Promise<() => any> {
  session.logger.debug('starting profile');

  await session.post('Profiler.enable');
  // microseconds, v8 default is 1000
  await session.post('Profiler.setSamplingInterval', { interval });
  await session.post('Profiler.start');

  // returned function which stops the profile and resolves to the profile data
  return async function stopProfiling() {
    session.logger.debug('stopping profile');
    const result: any = await session.post('Profiler.stop');
    return result.profile;
  };
}
