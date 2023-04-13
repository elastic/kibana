/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger, IRouter } from 'kibana/server';
import { createSession, Session } from '../lib/v8_profiling/session';
import { startProfiling } from '../lib/v8_profiling/profile';
import { createDeferred } from '../lib/deferred';

const routeValidation = {
  query: schema.object({
    duration: schema.number({ defaultValue: 5 }),
    // microseconds, v8 default is 1000
    interval: schema.number({ defaultValue: 1000 }),
  }),
};

const routeConfig = {
  path: '/_dev/cpu_profile',
  validate: routeValidation,
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    const { duration, interval } = request.query;

    let session: Session;
    try {
      session = await createSession(logger);
    } catch (err) {
      return response.badRequest({ body: `unable to create session: ${err.message}` });
    }

    logger.info(`starting cpuProfile with duration ${duration}s, interval ${interval}μs`);
    const deferred = createDeferred();
    let stopProfiling: any;
    try {
      stopProfiling = await startProfiling(session, request.query.interval);
    } catch (err) {
      return response.badRequest({ body: `unable to start profiling: ${err.message}` });
    }

    setTimeout(whenDone, 1000 * request.query.duration);

    let profile;
    async function whenDone() {
      logger.info(`stopping cpuProfile`);
      try {
        profile = await stopProfiling();
      } catch (err) {
        logger.warn(`unable to capture profile: ${err.message}`);
      }
      deferred.resolve();
    }

    await deferred.promise;

    try {
      await session.destroy();
    } catch (err) {
      logger.warn(`unable to destroy session: ${err.message}`);
    }

    if (profile == null) {
      return response.badRequest({ body: `unable to capture profile` });
    }

    const fileName = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/\//g, '-')
      .replace(/:/g, '-')
      .substring(5, 19);

    return response.ok({
      body: profile,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}.cpuprofile"`,
      },
    });
  });
}
