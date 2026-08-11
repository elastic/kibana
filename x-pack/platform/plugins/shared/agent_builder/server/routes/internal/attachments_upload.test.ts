/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';
import { registerAttachmentUploadRoute } from './attachments_upload';

const ROUTE_PATH = `${internalApiPath}/conversations/{conversation_id}/attachments/upload`;

interface UploadRouteConfig {
  path: string;
  validate: {
    body: {
      validate(value: Buffer): Buffer;
    };
  };
  options: {
    body: {
      accepts: string[];
      parse?: boolean;
    };
  };
}

describe('attachment upload route', () => {
  it('configures the body as an unparsed buffer so uploaded bytes are preserved', () => {
    let routeConfig: UploadRouteConfig | undefined;
    const router = {
      post: jest.fn().mockImplementation((config: UploadRouteConfig) => {
        routeConfig = config;
      }),
    } as unknown as IRouter;

    registerAttachmentUploadRoute({
      router,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    if (!routeConfig) {
      throw new Error('Upload route was not registered');
    }

    expect(routeConfig.path).toBe(ROUTE_PATH);
    expect(routeConfig.options.body.parse).toBe(false);

    const uploadedBytes = Buffer.from('[{"message":"hello"}]\n', 'utf8');
    const validatedBody = routeConfig.validate.body.validate(uploadedBytes);

    expect(Buffer.isBuffer(validatedBody)).toBe(true);
    expect(validatedBody).toEqual(uploadedBytes);
  });

  it('derives accepted request MIME types from the configured validators', () => {
    let routeConfig: UploadRouteConfig | undefined;
    const router = {
      post: jest.fn().mockImplementation((config: UploadRouteConfig) => {
        routeConfig = config;
      }),
    } as unknown as IRouter;

    registerAttachmentUploadRoute(
      {
        router,
        logger: loggingSystemMock.createLogger(),
      } as unknown as RouteDependencies,
      {
        contentValidators: {
          custom: {
            mimeType: 'application/x-custom',
            validate: () => undefined,
          },
        },
      }
    );

    if (!routeConfig) {
      throw new Error('Upload route was not registered');
    }

    expect(routeConfig.options.body.accepts).toEqual([
      'application/octet-stream',
      'application/x-custom',
    ]);
  });
});
