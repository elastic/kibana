/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import fetch from 'node-fetch';

import {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from 'src/core/server';
import { Logger } from '../log';

export async function checkCodeNode(url: string, log: Logger, rndStr: string) {
  try {
    const res = await fetch(`${url}/api/code/codeNode?rndStr=${rndStr}`, {});
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // request failed
    log.error(e);
  }

  log.info(`Access code node ${url} failed, try again later.`);
  return null;
}

export function checkRoute(router: IRouter, rndStr: string) {
  router.get(
    {
      path: '/api/code/codeNode',
      validate: {
        query: schema.object({}, { allowUnknowns: true }),
      },
      options: {
        authRequired: false,
      },
    },
    (context: RequestHandlerContext, req: KibanaRequest, res: KibanaResponseFactory) => {
      return res.ok({
        // @ts-ignore
        body: { me: req.query.rndStr === rndStr },
      });
    }
  );
}
