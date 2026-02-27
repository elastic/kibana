/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import apm from 'elastic-apm-node';

import type { Logger } from '@kbn/logging';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { LogMeta } from '@kbn/core/server';
import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { momentDateParser } from '../../common/utils';
import { METRIC_TYPE_VALUES, type MetricTypes } from '../../common/rest_types';
import type { UsageMetricsRequestBody } from '../routes/internal/usage_metrics';
import type { AutoOpsConfig } from '../types';
import { AutoOpsError } from '../errors';
import { appContextService } from './app_context';

const AUTO_OPS_REQUEST_FAILED_PREFIX = '[AutoOps API] Request failed';
const AUTO_OPS_MISSING_CONFIG_ERROR = 'Missing autoops configuration';

const getAutoOpsAPIRequestUrl = (url?: string, projectId?: string): string =>
  `${url}/monitoring/serverless/v1/projects/${projectId}/metrics`;

export class AutoOpsAPIService {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
  public async autoOpsUsageMetricsAPI(requestBody: UsageMetricsRequestBody) {
    const traceId = apm.currentTransaction?.traceparent;
    const withRequestIdMessage = (message: string) => `${message} [Request Id: ${traceId}]`;

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const autoopsConfig = appContextService.getConfig()?.autoops;
    if (!autoopsConfig) {
      this.logger.error(`[AutoOps API] ${AUTO_OPS_MISSING_CONFIG_ERROR}`, errorMetadata);
      throw new AutoOpsError(AUTO_OPS_MISSING_CONFIG_ERROR);
    }

    if (!autoopsConfig.api?.url) {
      this.logger.error(`[AutoOps API] Missing API URL in the configuration.`, errorMetadata);
      throw new AutoOpsError('Missing API URL in AutoOps configuration.');
    }

    if (!autoopsConfig.api?.tls?.certificate || !autoopsConfig.api?.tls?.key) {
      this.logger.error(
        `[AutoOps API] Missing required TLS certificate or key in the configuration.`,
        errorMetadata
      );
      throw new AutoOpsError('Missing required TLS certificate or key in AutoOps configuration.');
    }

    this.logger.debug(
      `[AutoOps API] Creating autoops agent with request URL: ${autoopsConfig.api.url} and TLS cert: [REDACTED] and TLS key: [REDACTED]`
    );

    const controller = new AbortController();
    const tlsConfig = this.createTlsConfig(autoopsConfig);
    const cloudSetup = appContextService.getCloud();

    const requestConfig: AxiosRequestConfig = {
      url: getAutoOpsAPIRequestUrl(autoopsConfig.api?.url, cloudSetup?.serverless.projectId),
      data: {
        from: momentDateParser(requestBody.from)?.toISOString(),
        to: momentDateParser(requestBody.to)?.toISOString(),
        size: requestBody.dataStreams.length,
        level: 'datastream',
        metric_types: requestBody.metricTypes,
        allowed_indices: requestBody.dataStreams,
      },
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'X-Request-ID': traceId,
        traceparent: traceId,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      }),
    };

    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    this.logger.debug(
      `[AutoOps API] Creating autoops agent with request config ${requestConfigDebugStatus}`
    );
    const errorMetadataWithRequestConfig: LogMeta = {
      ...errorMetadata,
      http: {
        request: {
          id: traceId,
          body: requestConfig.data,
        },
      },
    };

    const response = await axios<UsageMetricsAutoOpsResponseSchemaBody>(requestConfig).catch(
      (error: Error | AxiosError) => {
        if (!axios.isAxiosError(error)) {
          this.logger.error(
            `${AUTO_OPS_REQUEST_FAILED_PREFIX} with an error ${error}, request config: ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AutoOpsError(withRequestIdMessage(error.message));
        }

        const errorLogCodeCause = `${error.code}  ${this.convertCauseErrorsToString(error)}`;

        if (error.response) {
          // The request was made and the server responded with a status code and error data
          this.logger.error(
            `${AUTO_OPS_REQUEST_FAILED_PREFIX} because the AutoOps API responded with a status code that falls out of the range of 2xx: ${JSON.stringify(
              error.response.status
            )}} ${JSON.stringify(
              error.response.data
            )}}, request config: ${requestConfigDebugStatus}`,
            {
              ...errorMetadataWithRequestConfig,
              http: {
                ...errorMetadataWithRequestConfig.http,
                response: {
                  status_code: error.response.status,
                  body: error.response.data,
                },
              },
            }
          );
          throw new AutoOpsError(
            withRequestIdMessage(
              `${AUTO_OPS_REQUEST_FAILED_PREFIX} with status code: ${error.response.status}`
            )
          );
        } else if (error.request) {
          // The request was made but no response was received
          this.logger.error(
            `${AUTO_OPS_REQUEST_FAILED_PREFIX} while sending the request to the AutoOps API: ${errorLogCodeCause}, request config: ${requestConfigDebugStatus}`,
            errorMetadataWithRequestConfig
          );
          throw new AutoOpsError(withRequestIdMessage(`no response received from the AutoOps API`));
        } else {
          // Something happened in setting up the request that triggered an Error
          this.logger.error(
            `${AUTO_OPS_REQUEST_FAILED_PREFIX} with ${errorLogCodeCause}, request config: ${requestConfigDebugStatus}, error: ${error.toJSON()}`,
            errorMetadataWithRequestConfig
          );
          throw new AutoOpsError(
            withRequestIdMessage(`${AUTO_OPS_REQUEST_FAILED_PREFIX}, ${error.message}`)
          );
        }
      }
    );

    const validatedResponse = UsageMetricsAutoOpsResponseSchema.body().validate(response.data);

    this.logger.debug(`[AutoOps API] Successfully created an autoops agent ${response}`);
    return validatedResponse;
  }

  private createTlsConfig(autoopsConfig: AutoOpsConfig | undefined) {
    return new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: autoopsConfig?.api?.tls?.certificate,
        key: autoopsConfig?.api?.tls?.key,
      })
    );
  }

  private createRequestConfigDebug(requestConfig: AxiosRequestConfig<any>) {
    return JSON.stringify({
      ...requestConfig,
      data: {
        ...requestConfig.data,
        fleet_token: '[REDACTED]',
      },
      httpsAgent: {
        ...requestConfig.httpsAgent,
        options: {
          ...requestConfig.httpsAgent.options,
          cert: requestConfig.httpsAgent.options.cert ? 'REDACTED' : undefined,
          key: requestConfig.httpsAgent.options.key ? 'REDACTED' : undefined,
        },
      },
    });
  }

  private convertCauseErrorsToString = (error: AxiosError) => {
    if (error.cause instanceof AggregateError) {
      return error.cause.errors.map((e: Error) => e.message);
    }
    return error.cause;
  };
}

export const metricTypesSchema = schema.oneOf(
  METRIC_TYPE_VALUES.map((metricType) => schema.literal(metricType)) as [Type<MetricTypes>] // Create a oneOf schema for the keys
);

const UsageMetricsAutoOpsResponseSchema = {
  body: () =>
    schema.recordOf(
      metricTypesSchema,
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          error: schema.nullable(schema.string()),
          data: schema.maybe(
            schema.nullable(
              schema.arrayOf(schema.arrayOf(schema.number(), { minSize: 2, maxSize: 2 }), {
                maxSize: 1000,
              })
            )
          ),
        }),
        { maxSize: 1000 }
      )
    ),
};

export type UsageMetricsAutoOpsResponseMetricSeries = TypeOf<
  typeof UsageMetricsAutoOpsResponseSchema.body
>[MetricTypes][number];

export type UsageMetricsAutoOpsResponseSchemaBody = Partial<
  Record<MetricTypes, UsageMetricsAutoOpsResponseMetricSeries[]>
>;
