/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { DataUsageContext, DataUsageRequestHandlerContext } from '../../types';
import { errorHandler } from '../error_handler';
import { getMeteringStats } from '../../utils/get_metering_stats';
import type {
  DataStreamsRequestQuery,
  DataStreamsResponseBodySchemaBody,
} from '../../../common/rest_types/data_streams';
import { NoIndicesMeteringError, NoPrivilegeMeteringError } from '../../errors';
import { CustomHttpRequestError } from '../../utils';

export const getDataStreamsHandler = (
  dataUsageContext: DataUsageContext
): RequestHandler<never, DataStreamsRequestQuery, unknown, DataUsageRequestHandlerContext> => {
  const logger = dataUsageContext.logFactory.get('dataStreamsRoute');
  return async (context, request, response) => {
    const { includeZeroStorage } = request.query;

    logger.debug('Retrieving user data streams');

    try {
      const core = await context.core;
      const { datastreams: meteringStatsDataStreams } = await getMeteringStats(
        core.elasticsearch.client.asSecondaryAuthUser
      );

      if (!meteringStatsDataStreams || !meteringStatsDataStreams.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('No data streams found', 404)
        );
      }

      const nonSystemDataStreams = meteringStatsDataStreams.filter((dataStream) => {
        return !dataStream.name?.startsWith('.');
      });

      if (!nonSystemDataStreams || !nonSystemDataStreams.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError('No user defined data streams found', 404)
        );
      }

      const body = nonSystemDataStreams
        .reduce<DataStreamsResponseBodySchemaBody>((acc, stat) => {
          if (includeZeroStorage || stat.size_in_bytes > 0) {
            acc.push({
              name: stat.name,
              storageSizeBytes: stat.size_in_bytes,
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.storageSizeBytes - a.storageSizeBytes);

      if (!body || !body.length) {
        return errorHandler(
          logger,
          response,
          new CustomHttpRequestError(
            'No relevant user defined data streams found with storage size greater than zero',
            404
          )
        );
      }

      return response.ok({
        body,
      });
    } catch (error) {
      if (error.message.includes('security_exception')) {
        return errorHandler(logger, response, new NoPrivilegeMeteringError());
      } else if (error.message.includes('index_not_found_exception')) {
        return errorHandler(logger, response, new NoIndicesMeteringError());
      }

      return errorHandler(logger, response, error);
    }
  };
};
