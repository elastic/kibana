/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import { z } from '@kbn/zod';
import type { AxiosError } from 'axios';
import type { ConnectorUsageCollector } from '../usage';
import { SubActionConnector } from './sub_action_connector';
import { CaseConnector } from './case';
import type { ExternalServiceIncidentResponse, ServiceParams } from './types';

export const TestConfigSchema = z.object({ url: z.string() });
export const TestSecretsSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type TestConfig = z.infer<typeof TestConfigSchema>;
export type TestSecrets = z.infer<typeof TestSecretsSchema>;

export interface GetIncidentResponse {
  id: string;
  title: string;
  description?: string;
  severity: number;
}

export interface Incident {
  name: string;
  category: string | null;
}

interface ErrorSchema {
  errorMessage: string;
  errorCode: number;
}

export class TestSubActionConnector extends SubActionConnector<TestConfig, TestSecrets> {
  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'testUrl',
      method: 'testUrl',
      schema: z.object({ url: z.string() }),
    });

    this.registerSubAction({
      name: 'testData',
      method: 'testData',
      schema: null,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async testUrl(
    { url, data = {} }: { url: string; data?: Record<string, unknown> | null },
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const res = await this.request(
      {
        url,
        data,
        headers: { 'X-Test-Header': 'test' },
        responseSchema: z.object({ status: z.string() }),
      },
      connectorUsageCollector
    );

    return res;
  }

  public async testData(
    { data }: { data: Record<string, unknown> },
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const res = await this.request(
      {
        url: 'https://example.com',
        data: this.removeNullOrUndefinedFields(data),
        headers: { 'X-Test-Header': 'test' },
        responseSchema: z.object({ status: z.string() }),
      },
      connectorUsageCollector
    );

    return res;
  }

  public async testAuth(
    { headers }: { headers?: Record<string, unknown> } = {},
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const res = await this.request(
      {
        url: 'https://example.com',
        data: {},
        auth: { username: 'username', password: 'password' },
        headers: { 'X-Test-Header': 'test', ...headers },
        responseSchema: z.object({ status: z.string() }),
      },
      connectorUsageCollector
    );

    return res;
  }
}

export class TestNoSubActions extends SubActionConnector<TestConfig, TestSecrets> {
  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Error`;
  }
}

export class TestExecutor extends SubActionConnector<TestConfig, TestSecrets> {
  public notAFunction = 'notAFunction';

  constructor(params: ServiceParams<TestConfig, TestSecrets>) {
    super(params);
    this.registerSubAction({
      name: 'testUrl',
      method: 'not-exist',
      schema: z.object({}),
    });

    this.registerSubAction({
      name: 'notAFunction',
      method: 'notAFunction',
      schema: z.object({}),
    });

    this.registerSubAction({
      name: 'echo',
      method: 'echo',
      schema: z.object({ id: z.string() }),
    });

    this.registerSubAction({
      name: 'noSchema',
      method: 'noSchema',
      schema: null,
    });

    this.registerSubAction({
      name: 'noData',
      method: 'noData',
      schema: null,
    });

    this.registerSubAction({
      name: 'noAsync',
      method: 'noAsync',
      schema: null,
    });
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Error`;
  }

  public async echo({ id }: { id: string }) {
    return Promise.resolve({ id });
  }

  public async noSchema({ id }: { id: string }) {
    return { id };
  }

  public async noData() {}

  public noAsync() {}
}

export class TestCaseConnector extends CaseConnector<
  TestConfig,
  TestSecrets,
  Incident,
  GetIncidentResponse
> {
  constructor(
    params: ServiceParams<TestConfig, TestSecrets>,
    pushToServiceParamsSchema: Record<string, z.ZodType<unknown>>
  ) {
    super(params, pushToServiceParamsSchema);
  }

  protected getResponseErrorMessage(error: AxiosError<ErrorSchema>) {
    return `Message: ${error.response?.data.errorMessage}. Code: ${error.response?.data.errorCode}`;
  }

  public async createIncident(incident: Incident): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'create-incident',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async addComment({
    incidentId,
    comment,
  }: {
    incidentId: string;
    comment: string;
  }): Promise<void> {}

  public async updateIncident({
    incidentId,
    incident,
  }: {
    incidentId: string;
    incident: Incident;
  }): Promise<ExternalServiceIncidentResponse> {
    return {
      id: 'update-incident',
      title: 'Test incident',
      url: 'https://example.com',
      pushedDate: '2022-05-06T09:41:00.401Z',
    };
  }

  public async getIncident({ id }: { id: string }): Promise<GetIncidentResponse> {
    return {
      id: 'get-incident',
      title: 'Test incident',
      severity: 4,
    };
  }
}
