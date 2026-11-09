/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateJobResponse,
  EsqlSummaryParams,
  Job,
  JobList,
  Task,
  TaskList,
} from '../common/types';
import type { TaskRunnerPocConfig } from './config';
import { TaskRunnerServiceError } from './service_error';

const REQUEST_TIMEOUT_MS = 10_000;

/** Request body of the service's `POST /v1/projects/{projectId}/jobs`. */
export interface ServiceCreateJobRequest {
  taskType: string;
  params: EsqlSummaryParams;
  apiKey: string;
  every?: string;
  runAt?: string;
  timeout?: string;
  maxExecutions?: number;
  idempotencyKey?: string;
}

interface ServiceErrorBody {
  error?: { code?: string; message?: string };
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Calls the task runner control plane for the configured project, with the shared secret. */
export class TaskRunnerServiceClient {
  constructor(
    private readonly config: TaskRunnerPocConfig,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  public createJob(body: ServiceCreateJobRequest): Promise<CreateJobResponse> {
    return this.request<CreateJobResponse>('POST', '/jobs', body);
  }

  public listJobs(limit?: number): Promise<JobList> {
    return this.request<JobList>('GET', `/jobs${limitQuery(limit)}`);
  }

  public getJob(jobId: string): Promise<Job> {
    return this.request<Job>('GET', `/jobs/${encodeURIComponent(jobId)}`);
  }

  public async deleteJob(jobId: string): Promise<void> {
    await this.request<undefined>('DELETE', `/jobs/${encodeURIComponent(jobId)}`);
  }

  public listJobTasks(jobId: string, limit?: number): Promise<TaskList> {
    return this.request<TaskList>(
      'GET',
      `/jobs/${encodeURIComponent(jobId)}/tasks${limitQuery(limit)}`
    );
  }

  public listTasks(limit?: number): Promise<TaskList> {
    return this.request<TaskList>('GET', `/tasks${limitQuery(limit)}`);
  }

  public getTask(taskId: string): Promise<Task> {
    return this.request<Task>('GET', `/tasks/${encodeURIComponent(taskId)}`);
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const { serviceUrl, sharedSecret, projectId } = this.config;
    if (!sharedSecret) {
      throw new TaskRunnerServiceError(
        'task_runner_poc.sharedSecret is not set in the Kibana config',
        0,
        'not_configured'
      );
    }
    const url = `${serviceUrl.replace(/\/+$/, '')}/v1/projects/${encodeURIComponent(
      projectId
    )}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${sharedSecret}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TaskRunnerServiceError(
          `Task runner service at ${serviceUrl} didn't answer within ${REQUEST_TIMEOUT_MS} ms`,
          0,
          'timeout'
        );
      }
      throw new TaskRunnerServiceError(
        `Task runner service at ${serviceUrl} is unreachable`,
        0,
        'unreachable'
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    const json = text ? parseJson(text) : undefined;
    if (!response.ok) {
      const { code, message } = (json as ServiceErrorBody | undefined)?.error ?? {};
      throw new TaskRunnerServiceError(
        message ?? `Task runner service returned HTTP ${response.status}`,
        response.status,
        code ?? 'unknown'
      );
    }
    if (response.status === 204) {
      return undefined as T;
    }
    if (json === undefined) {
      throw new TaskRunnerServiceError(
        `Task runner service returned a response that isn't JSON (HTTP ${response.status})`,
        response.status,
        'bad_response'
      );
    }
    return json as T;
  }
}

const limitQuery = (limit?: number) => (limit === undefined ? '' : `?limit=${limit}`);
