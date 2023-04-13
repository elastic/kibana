/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, IRouter } from 'kibana/server';
import { createSession, Session } from '../lib/v8_profiling/session';
import { takeHeapSnapshot } from '../lib/v8_profiling/heap_snapshot';

const routeConfig = {
  path: '/_dev/heap_snapshot',
  validate: {},
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    let session: Session;
    try {
      session = await createSession(logger);
    } catch (err) {
      return response.badRequest({ body: `unable to create session: ${err.message}` });
    }

    logger.info(`starting heap snapshot`);
    let snapshot;
    try {
      snapshot = await takeHeapSnapshot(session);
    } catch (err) {
      return response.badRequest({ body: `unable to take heap snapshot: ${err.message}` });
    }

    logger.info(`finished heap snapshot`);

    const fileName = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/\//g, '-')
      .replace(/:/g, '-')
      .substring(5, 19);

    return response.ok({
      body: snapshot,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}.heapsnapshot"`,
      },
    });
  });
}
