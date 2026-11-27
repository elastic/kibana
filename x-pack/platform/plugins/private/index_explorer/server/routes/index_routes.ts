/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { API_BASE_PATH } from '../../common/constants';
import { findIndexMetadata } from '../../common/metadata';
import type {
  FieldValuesResponse,
  GetDocumentResponse,
  GetFieldsResponse,
  HistogramResponse,
  ListIndicesResponse,
  SearchResponse,
} from '../../common/types';
import { esqlToFile } from '../lib/export';
import { getFieldValues, getFields } from '../lib/fields';
import { handleError } from '../lib/handle_error';
import { getHistogram } from '../lib/histogram';
import { listIndices } from '../lib/indices';
import { exportIndex, getDocument, searchIndex } from '../lib/table';
import {
  documentParamsSchema,
  exportIndexBodySchema,
  fieldValuesQuerySchema,
  histogramBodySchema,
  indexParamsSchema,
  listIndicesQuerySchema,
  searchBodySchema,
} from './schemas';
import type { RouteDependencies } from './types';

/** Registers routes for listing indices and for the ES|QL-backed table and document views. */
export function registerIndexRoutes({ router, config, logger }: RouteDependencies): void {
  router.get(
    {
      path: `${API_BASE_PATH}/indices`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { query: listIndicesQuerySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const indices = await listIndices({
          esClient,
          includeHidden: request.query.includeHidden,
          metadata: config.indices,
        });
        const body: ListIndicesResponse = { indices };
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.get(
    {
      path: `${API_BASE_PATH}/indices/{index}/fields`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: indexParamsSchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body: GetFieldsResponse = { fields: await getFields(esClient, request.params.index) };
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.get(
    {
      path: `${API_BASE_PATH}/indices/{index}/field_values`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: indexParamsSchema, query: fieldValuesQuerySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body: FieldValuesResponse = await getFieldValues({
          esClient,
          index: request.params.index,
          field: request.query.field,
        });
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: `${API_BASE_PATH}/indices/{index}/_histogram`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: indexParamsSchema, body: histogramBodySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const body: HistogramResponse = await getHistogram({
          esClient,
          index: request.params.index,
          ...request.body,
        });
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: `${API_BASE_PATH}/indices/{index}/_search`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: indexParamsSchema, body: searchBodySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { index } = request.params;
        const body: SearchResponse = await searchIndex({
          esClient,
          index,
          body: request.body,
          metadata: findIndexMetadata(index, config.indices),
        });
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: `${API_BASE_PATH}/indices/{index}/_export`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: indexParamsSchema, body: exportIndexBodySchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { index } = request.params;
        const { format, ...state } = request.body;
        const result = await exportIndex({
          esClient,
          index,
          body: state,
          maxRows: config.maxExportRows,
        });
        const file = esqlToFile(index, result, format);
        return response.ok({
          body: file.body,
          headers: {
            'content-type': file.contentType,
            'content-disposition': `attachment; filename="${file.filename}"`,
          },
        });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );

  router.get(
    {
      path: `${API_BASE_PATH}/indices/{index}/doc/{id}`,
      security: { authz: AuthzDisabled.delegateToESClient },
      validate: { params: documentParamsSchema },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { index, id } = request.params;
        const body: GetDocumentResponse | undefined = await getDocument({ esClient, index, id });
        if (!body) {
          return response.notFound({
            body: { message: `Document "${id}" not found in "${index}"` },
          });
        }
        return response.ok({ body });
      } catch (error) {
        return handleError(error, response, logger);
      }
    }
  );
}
