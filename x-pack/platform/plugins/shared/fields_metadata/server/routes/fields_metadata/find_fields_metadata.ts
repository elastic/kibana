/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createValidationFunction } from '../../../common/runtime_types';
import { FIND_FIELDS_METADATA_URL } from '../../../common/fields_metadata';
import * as fieldsMetadataV1 from '../../../common/fields_metadata/v1';
import { FieldsMetadataBackendLibs } from '../../lib/shared_types';
import { FindFieldsMetadataResponsePayload } from '../../../common/fields_metadata/v1';
import { PackageNotFoundError } from '../../services/fields_metadata/errors';

export const initFindFieldsMetadataRoute = ({
  router,
  getStartServices,
}: FieldsMetadataBackendLibs) => {
  router.versioned
    .get({
      access: 'internal',
      path: FIND_FIELDS_METADATA_URL,
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization to keep available the access to static fields metadata such as ECS fields. For other sources (fleet integrations), appropriate checks are performed at the API level.',
          },
        },
        validate: {
          request: {
            query: createValidationFunction(fieldsMetadataV1.findFieldsMetadataRequestQueryRT),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { attributes, fieldNames, integration, dataset } = request.query;
        const [_core, _startDeps, startContract] = await getStartServices();

        const fieldsMetadataClient = await startContract.getClient(request);

        try {
          const fieldsDictionary = await fieldsMetadataClient.find({
            fieldNames,
            integration,
            dataset,
          });

          const responsePayload: FindFieldsMetadataResponsePayload = { fields: {} };

          if (attributes) {
            responsePayload.fields = fieldsDictionary.pick(attributes);
          } else {
            responsePayload.fields = fieldsDictionary.toPlain();
          }

          return response.ok({
            body: fieldsMetadataV1.findFieldsMetadataResponsePayloadRT.encode(responsePayload),
          });
        } catch (error) {
          if (error instanceof PackageNotFoundError) {
            return response.badRequest({
              body: {
                message: error.message,
              },
            });
          }

          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: {
              message: error.message ?? 'An unexpected error occurred',
            },
          });
        }
      }
    );
};
