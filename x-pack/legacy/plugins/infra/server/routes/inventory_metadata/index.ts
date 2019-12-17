/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { throwErrors } from '../../../common/runtime_types';
import { getAWSMetadata } from './lib/get_aws_metadata';
import {
  InventoryMetaRequestRT,
  InventoryMetaResponseRT,
} from '../../../common/http_api/inventory_meta_api';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initInventoryMetaRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/inventory/meta',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const { sourceId, nodeType } = pipe(
          InventoryMetaRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { configuration } = await libs.sources.getSourceConfiguration(
          requestContext,
          sourceId
        );
        const awsMetadata = await getAWSMetadata(
          framework,
          requestContext,
          configuration,
          nodeType
        );

        return response.ok({
          body: InventoryMetaResponseRT.encode(awsMetadata),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
