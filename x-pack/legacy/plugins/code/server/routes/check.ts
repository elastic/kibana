/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import fetch from 'node-fetch';
import { Logger } from '../log';

export async function checkCodeNode(url: string, log: Logger, rndStr: string) {
  const res = await fetch(`${url}/api/code/codeNode?rndStr=${rndStr}`, {});
  if (res.ok) {
    return await res.json();
  }

  log.info(`Access code node ${url} failed, try again later.`);
  return null;
}

export function checkRoute(server: Server, rndStr: string) {
  server.route({
    method: 'GET',
    path: '/api/code/codeNode',
    options: { auth: false },
    handler(req: any) {
      return { me: req.query.rndStr === rndStr };
    },
  });
}
