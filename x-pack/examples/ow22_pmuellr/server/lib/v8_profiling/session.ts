/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import { createDeferred } from '../deferred';

let inspector: any = null;
try {
  inspector = require('inspector');
} catch (err) {
  // inspector will be null :-(
}

export async function createSession(logger: Logger): Promise<Session> {
  logger.debug('creating session');

  if (inspector == null) {
    throw new Error('the inspector module is not available for this version of node');
  }

  let session = null;
  try {
    session = new inspector.Session();
  } catch (err) {
    throw new Error(`error creating inspector session: ${err.message}`);
  }

  try {
    session.connect();
  } catch (err) {
    throw new Error(`error connecting inspector session: ${err.message}`);
  }

  return new Session(logger, session);
}

export class Session {
  readonly logger: Logger;
  private session: any;

  constructor(logger: Logger, session: any) {
    this.logger = logger;
    this.session = session;
  }

  async destroy() {
    this.session.disconnect();
    this.session = null;
  }

  on(event: string, handler: any) {
    this.session.on(event, handler);
  }

  async post(method: string, args?: any) {
    this.logger.debug(`posting method ${method} ${JSON.stringify(args)}`);
    if (this.session == null) {
      throw new Error('session disconnected');
    }

    const deferred = createDeferred();

    this.session.post(method, args, (err: any, response: any) => {
      if (err) {
        this.logger.debug(`error from method ${method}: ${err.message}`);
        return deferred.reject(err);
      }
      deferred.resolve(response);
    });

    return deferred.promise;
  }
}
