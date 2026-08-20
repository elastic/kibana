/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult, DiagnosticResult } from '@elastic/elasticsearch';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { errorHandler } from './error_handler';

const createApiResponseError = ({
  statusCode = 500,
  body = {},
}: {
  statusCode?: number;
  body?: DiagnosticResult['body'];
} = {}): TransportResult => {
  return {
    body,
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  };
};

describe('errorHandler', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  const context = {} as RequestHandlerContext;

  const runWithError = async (error: unknown) => {
    const response = httpServerMock.createResponseFactory();
    const wrapped = errorHandler(logger)(async () => {
      throw error;
    });
    await wrapped(context, request, response);
    return response;
  };

  it('forwards denied-endpoint conflict fields as body.attributes on a 409', async () => {
    const esError = {
      type: 'status_exception',
      reason: 'Policy would deny endpoints currently in use.',
      denied_endpoint_ids: ['.elser-2-elastic', '.jina-embeddings-v5-text-small'],
      referencing_pipelines: '.elser-2-elastic:region-policy-force-test',
      referencing_indexes: [
        '.elser-2-elastic:region-policy-force-test-index',
        '.jina-embeddings-v5-text-small:.integration_knowledge-7',
      ],
    };
    const response = await runWithError(
      new errors.ResponseError(
        createApiResponseError({
          statusCode: 409,
          body: { error: esError },
        })
      )
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: {
        message: 'Policy would deny endpoints currently in use.',
        attributes: {
          denied_endpoint_ids: esError.denied_endpoint_ids,
          referencing_pipelines: esError.referencing_pipelines,
          referencing_indexes: esError.referencing_indexes,
        },
      },
    });
  });

  it('omits attributes for a concurrent-update 409 with no denied-endpoint metadata', async () => {
    const response = await runWithError(
      new errors.ResponseError(
        createApiResponseError({
          statusCode: 409,
          body: {
            error: {
              type: 'status_exception',
              reason: 'Failed to put region policy due to a concurrent update conflict.',
            },
          },
        })
      )
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: { message: 'Failed to put region policy due to a concurrent update conflict.' },
    });
  });

  it('omits attributes for a non-409 ES error even if the body looks like a conflict', async () => {
    const response = await runWithError(
      new errors.ResponseError(
        createApiResponseError({
          statusCode: 400,
          body: {
            error: {
              type: 'status_exception',
              reason: 'Invalid region policy.',
              denied_endpoint_ids: ['.elser-2-elastic'],
              referencing_indexes: ['.elser-2-elastic:my-index'],
            },
          },
        })
      )
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'Invalid region policy.' },
    });
  });

  it('maps a KibanaServerError to customError', async () => {
    const response = await runWithError({ statusCode: 403, message: 'Forbidden' });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: 'Forbidden',
    });
  });

  it('rethrows a non-object error', async () => {
    await expect(runWithError(null)).rejects.toBeNull();
  });
});
