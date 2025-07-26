/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { boomify, isBoom } from '@hapi/boom';

import { TypeOf } from '@kbn/config-schema';

import { LENS_VIS_API_PATH, LENS_API_VERSION, LENS_API_ACCESS } from '../../../../common/constants';
import {
  LENS_CONTENT_TYPE,
  LensCreateIn,
  type LensSavedObject,
} from '../../../../common/content_management';
import { RegisterAPIRouteFn } from '../../types';
import { ConfigBuilderStub } from '../../../../common/transforms';
import { lensCreateRequestBodySchema, lensCreateResponseBodySchema } from './schema';
import { getLensResponseItem } from '../utils';

export const registerLensVisualizationsCreateAPIRoute: RegisterAPIRouteFn = (
  router,
  { contentManagement }
) => {
  const createRoute = router.post({
    path: LENS_VIS_API_PATH,
    access: LENS_API_ACCESS,
    enableQueryVersion: true,
    summary: 'Create Lens visualization',
    description: 'Create a new Lens visualization.',
    options: {
      tags: ['oas-tag:Lens'],
      availability: {
        stability: 'experimental',
      },
    },
    security: {
      authz: {
        enabled: false,
        reason: 'Relies on Content Client for authorization',
      },
    },
  });

  createRoute.addVersion(
    {
      version: LENS_API_VERSION,
      validate: {
        request: {
          body: lensCreateRequestBodySchema,
        },
        response: {
          201: {
            body: () => lensCreateResponseBodySchema,
            description: 'Created',
          },
          400: {
            description: 'Malformed request',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden',
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    async (ctx, req, res) => {
      // TODO fix IContentClient to type this client based on the actual
      const client = contentManagement.contentClient
        .getForRequest({ request: req, requestHandlerContext: ctx })
        .for<LensSavedObject>(LENS_CONTENT_TYPE);

      // TODO: Find a better way to conditionally omit id
      const { references, ...lensItem } = omit(
        ConfigBuilderStub.in({
          id: '',
          ...req.body.data,
        }),
        'id'
      );

      try {
        // Note: these types are to enforce loose param typings of client methods
        const data: LensCreateIn['data'] = lensItem;
        const options: LensCreateIn['options'] = { ...req.body.options, references };
        const { result } = await client.create(data, options);

        if (result.item.error) {
          throw result.item.error;
        }

        return res.created<TypeOf<typeof lensCreateResponseBodySchema>>({
          body: getLensResponseItem(result.item),
        });
      } catch (error) {
        if (isBoom(error) && error.output.statusCode === 403) {
          return res.forbidden();
        }

        return boomify(error); // forward unknown error
      }
    }
  );
};
