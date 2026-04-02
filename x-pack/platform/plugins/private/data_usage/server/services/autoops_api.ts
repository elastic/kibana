/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import apm from 'elastic-apm-node';

import type { Logger } from '@kbn/logging';
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

    const requestUrl = getAutoOpsAPIRequestUrl(
      autoopsConfig.api?.url,
      cloudSetup?.serverless.projectId
    );
    const requestBodyData: Record<string, unknown> = {
      from: momentDateParser(requestBody.from)?.toISOString(),
      to: momentDateParser(requestBody.to)?.toISOString(),
      size: requestBody.dataStreams.length,
      level: 'datastream',
      metric_types: requestBody.metricTypes,
      allowed_indices: requestBody.dataStreams,
    };

    if (!cloudSetup?.isServerlessEnabled) {
      requestBodyData.stack_version = appContextService.getKibanaVersion();
    }

    const dispatcher = new Agent({
      connect: {
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
      },
    });

    const requestConfig = {
      url: requestUrl,
      data: requestBodyData,
      method: 'POST' as const,
      headers: {
        'Content-type': 'application/json',
        'X-Request-ID': traceId,
        traceparent: traceId,
      },
      dispatcher,
    };

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

    let response: Response;
    try {
      response = await globalThis.fetch(requestUrl, {
        method: 'POST',
        headers: requestConfig.headers as Record<string, string>,
        body: JSON.stringify(requestBodyData),
        signal: controller.signal,
        // @ts-expect-error -- dispatcher is a valid undici option for Node.js fetch
        dispatcher,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        const causeMessage =
          error.cause instanceof AggregateError
            ? error.cause.errors.map((e: Error) => e.message)
            : error.cause;
        const errorLogCodeCause = `${
          (error as Error & { code?: string }).code ?? ''
        }  ${causeMessage}`;

        this.logger.error(
          `${AUTO_OPS_REQUEST_FAILED_PREFIX} while sending the request to the AutoOps API: ${errorLogCodeCause}, request config: ${requestConfigDebugStatus}`,
          errorMetadataWithRequestConfig
        );
        throw new AutoOpsError(withRequestIdMessage(`no response received from the AutoOps API`));
      }

      this.logger.error(
        `${AUTO_OPS_REQUEST_FAILED_PREFIX} with an error ${error}, request config: ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );
      throw new AutoOpsError(withRequestIdMessage(String(error)));
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      this.logger.error(
        `${AUTO_OPS_REQUEST_FAILED_PREFIX} because the AutoOps API responded with a status code that falls out of the range of 2xx: ${JSON.stringify(
          response.status
        )}} ${JSON.stringify(responseBody)}}, request config: ${requestConfigDebugStatus}`,
        {
          ...errorMetadataWithRequestConfig,
          http: {
            ...errorMetadataWithRequestConfig.http,
            response: {
              status_code: response.status,
              body: { content: responseBody },
            },
          },
        }
      );
      throw new AutoOpsError(
        withRequestIdMessage(
          `${AUTO_OPS_REQUEST_FAILED_PREFIX} with status code: ${response.status}`
        )
      );
    }

    const responseData = (await response.json()) as UsageMetricsAutoOpsResponseSchemaBody;

    const validatedResponse = UsageMetricsAutoOpsResponseSchema.body().validate(responseData);

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

  private createRequestConfigDebug(requestConfig: {
    data: Record<string, unknown>;
    dispatcher: Agent;
    [key: string]: unknown;
  }) {
    return JSON.stringify({
      ...requestConfig,
      data: {
        ...requestConfig.data,
        fleet_token: '[REDACTED]',
      },
      dispatcher: '[Agent]',
    });
  }
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
