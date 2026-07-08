/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import {
  SUB_ACTION,
  WorkdayApiDoNotValidateResponsesSchema,
  WorkdayGetWorkerParamsSchema,
  WorkdayGetWorkerResponseSchema,
  WorkdaySearchWorkersParamsSchema,
  WorkdaySearchWorkersResponseSchema,
  type WorkdayConfig,
  type WorkdayGetWorkerParams,
  type WorkdayGetWorkerResponse,
  type WorkdaySearchWorkersParams,
  type WorkdaySearchWorkersResponse,
  type WorkdaySecrets,
} from '@kbn/connector-schemas/workday';

import { WorkdayError } from './error';
import { WorkdayTokenManager } from './token_manager';
import { isAggregateError, type NodeSystemError } from './types';

// Trim trailing slash so path joining is predictable.
const stripTrailingSlash = (u: string): string => (u.endsWith('/') ? u.slice(0, -1) : u);

export class WorkdayConnector extends SubActionConnector<WorkdayConfig, WorkdaySecrets> {
  private readonly apiBase: string;
  private tokenManager: WorkdayTokenManager;

  constructor(params: ServiceParams<WorkdayConfig, WorkdaySecrets>) {
    super(params);
    this.apiBase = stripTrailingSlash(this.config.apiUrl);
    this.tokenManager = new WorkdayTokenManager({
      ...params,
      apiRequest: (req, collector) => this.request(req, collector),
    });
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.GET_WORKER,
      method: 'getWorker',
      schema: WorkdayGetWorkerParamsSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.SEARCH_WORKERS,
      method: 'searchWorkers',
      schema: WorkdaySearchWorkersParamsSchema,
    });
  }

  public async getWorker(
    { workerId }: WorkdayGetWorkerParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<WorkdayGetWorkerResponse> {
    return this.workdayApiRequest<WorkdayGetWorkerResponse>(
      {
        url: `${this.apiBase}/workers/${encodeURIComponent(workerId)}`,
        method: 'GET',
        responseSchema:
          WorkdayGetWorkerResponseSchema as unknown as SubActionRequestParams<WorkdayGetWorkerResponse>['responseSchema'],
      },
      connectorUsageCollector
    );
  }

  public async searchWorkers(
    { search, limit, offset }: WorkdaySearchWorkersParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<WorkdaySearchWorkersResponse> {
    return this.workdayApiRequest<WorkdaySearchWorkersResponse>(
      {
        url: `${this.apiBase}/workers`,
        method: 'GET',
        params: {
          search,
          ...(limit !== undefined ? { limit } : {}),
          ...(offset !== undefined ? { offset } : {}),
        },
        responseSchema:
          WorkdaySearchWorkersResponseSchema as unknown as SubActionRequestParams<WorkdaySearchWorkersResponse>['responseSchema'],
      },
      connectorUsageCollector
    );
  }

  private workdayApiRequest = async <R>(
    req: SubActionRequestParams<R>,
    connectorUsageCollector: ConnectorUsageCollector,
    retried?: boolean
  ): Promise<R> => {
    try {
      const token = await this.tokenManager.get(connectorUsageCollector);
      const response = await this.request<R>(
        {
          ...req,
          // Workday's REST resource shapes vary by tenant and version — do not
          // enforce strict response validation for functional API calls.
          responseSchema:
            WorkdayApiDoNotValidateResponsesSchema as unknown as SubActionRequestParams<R>['responseSchema'],
          headers: {
            ...req.headers,
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
        connectorUsageCollector
      );
      return response.data;
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      if (status === 401 && !retried) {
        await this.tokenManager.generateNew(connectorUsageCollector);
        return this.workdayApiRequest<R>(req, connectorUsageCollector, true);
      }
      throw new WorkdayError(error.message);
    }
  };

  protected getResponseErrorMessage(
    error: AxiosError<{ error?: string; error_description?: string; message?: string }>
  ): string {
    const body = error.response?.data;
    if (body) {
      // OAuth2 token errors: { error, error_description }
      if (body.error_description) return body.error_description;
      if (body.error) return body.error;
      if (body.message) return body.message;
    }

    const cause: NodeSystemError | undefined = isAggregateError(error.cause)
      ? (error.cause.errors[0] as NodeSystemError)
      : (error.cause as NodeSystemError | undefined);
    if (cause) {
      if (cause.code === 'ENOTFOUND') return `URL not found: ${cause.hostname}`;
      if (cause.code === 'ECONNREFUSED')
        return `Connection refused: ${cause.address}:${cause.port}`;
    }

    if (!error.response?.status) {
      return `Unknown API Error: ${JSON.stringify(error.response?.data ?? {})}`;
    }
    return `API Error: ${JSON.stringify(error.response.data ?? {})}`;
  }
}
