/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError as StreamsSecurityError } from '@kbn/streams-plugin/server/lib/streams/errors/security_error';
import { DefinitionNotFoundError } from '@kbn/streams-plugin/server/lib/streams/errors/definition_not_found_error';
import { StatusError } from '../lib/errors/status_error';
import { createServerRoute } from './create_server_route';

type AnyHandlerParams = Parameters<
  ReturnType<typeof createServerRoute>[keyof ReturnType<typeof createServerRoute>]['handler']
>[0];

const buildRoute = (thrown: Error) =>
  createServerRoute({
    endpoint: 'GET /internal/test/error_mapping',
    options: { access: 'internal' },
    security: { authz: { requiredPrivileges: ['read_stream'] } },
    handler: async () => {
      throw thrown;
    },
  })['GET /internal/test/error_mapping'];

const callHandler = (thrown: Error) =>
  buildRoute(thrown).handler({} as unknown as AnyHandlerParams);

describe('createServerRoute error mapping', () => {
  it('maps the local StatusError to a Boom with the same status code', async () => {
    await expect(callHandler(new StatusError('nope', 409))).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
  });

  it('maps the streams plugin SecurityError to a 403 Boom', async () => {
    await expect(
      callHandler(new StreamsSecurityError('Cannot read stream, insufficient privileges'))
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });

  it('maps the streams plugin DefinitionNotFoundError to a 404 Boom', async () => {
    await expect(callHandler(new DefinitionNotFoundError('missing'))).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
  });

  it('leaves plain errors untouched', async () => {
    const plain = new Error('boom');
    await expect(callHandler(plain)).rejects.toBe(plain);
  });
});
