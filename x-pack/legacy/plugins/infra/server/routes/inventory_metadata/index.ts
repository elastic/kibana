/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { boomify } from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { throwErrors } from '../../../common/runtime_types';
import { getAWSMetadata } from './lib/get_aws_metadata';
import {
  InventoryMetaRequestRT,
  InventoryMetaWrappedRequest,
  InventoryMetaResponse,
  InventoryMetaResponseRT,
} from '../../../common/http_api/inventory_meta_api';

export const initInventoryMetaRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<InventoryMetaWrappedRequest, Promise<InventoryMetaResponse>>({
    method: 'POST',
    path: '/api/infra/inventory/meta',
    handler: async req => {
      const { sourceId } = pipe(
        InventoryMetaRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { configuration } = await libs.sources.getSourceConfiguration(req, sourceId);
      const awsMetadata = await getAWSMetadata(framework, req, configuration);

      return pipe(
        InventoryMetaResponseRT.decode(awsMetadata),
        fold(throwErrors(Boom.badImplementation), identity)
      );
    },
  });
};
