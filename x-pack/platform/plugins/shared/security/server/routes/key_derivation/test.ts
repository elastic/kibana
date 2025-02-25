/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import * as crypto from 'crypto';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

function runSingleTest(primaryKey: string, iterations: number, hashAlgorithm: string): number {
  const keyLength = primaryKey.length;
  const start = Date.now();
  const salt = crypto.randomBytes(keyLength);
  crypto.pbkdf2Sync(primaryKey, salt, iterations, keyLength, hashAlgorithm);
  const end = Date.now();
  return end - start;
}

export function defineKeyDerivationRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/derived_key_test',
      security: {
        authz: {
          enabled: false,
          reason: 'This route runs a performance test for the proposed key derivation function',
        },
      },
      validate: {
        request: {
          body: schema.object({
            key: schema.string({ minLength: 32 }),
            iterations: schema.number({ min: 1, max: 10000000 }),
            digest: schema.string({ minLength: 1, maxLength: 50 }),
            count: schema.number({ min: 1, max: 1000 }),
          }),
        },
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const { key, iterations, digest, count } = request.body;
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
          results.push(runSingleTest(key, iterations, digest));
        }
        return response.ok({
          body: {
            averageTime: results.reduce((acc, time) => acc + time, 0) / count,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
