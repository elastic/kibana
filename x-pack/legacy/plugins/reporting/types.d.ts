/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseObject } from 'hapi';
import { EventEmitter } from 'events';
import { Legacy } from 'kibana';
import { XPackMainPlugin } from '../xpack_main/xpack_main';
import {
  ElasticsearchPlugin,
  CallCluster,
} from '../../../../src/legacy/core_plugins/elasticsearch';
import { CancellationToken } from './common/cancellation_token';
import { HeadlessChromiumDriverFactory } from './server/browsers/chromium/driver_factory';
import { BrowserType } from './server/browsers/types';

export type Job = EventEmitter & {
  id: string;
  toJSON: () => {
    id: string;
  };
};

export interface ReportingPlugin {
  queue: {
    addJob: <PayloadType>(type: string, payload: PayloadType, options: object) => Job;
  };
  // TODO: convert exportTypesRegistry to TS
  exportTypesRegistry: {
    getById: <T, U, V, W>(id: string) => ExportTypeDefinition<T, U, V, W>;
    getAll: <T, U, V, W>() => Array<ExportTypeDefinition<T, U, V, W>>;
    get: <T, U, V, W>(
      callback: (item: ExportTypeDefinition<T, U, V, W>) => boolean
    ) => ExportTypeDefinition<T, U, V, W>;
  };
  browserDriverFactory: HeadlessChromiumDriverFactory;
}

export interface ReportingConfigOptions {
  browser: BrowserConfig;
  poll: {
    jobCompletionNotifier: {
      interval: number;
      intervalErrorMultiplier: number;
    };
    jobsRefresh: {
      interval: number;
      intervalErrorMultiplier: number;
    };
  };
  queue: QueueConfig;
  capture: CaptureConfig;
}

export interface NetworkPolicyRule {
  allow: boolean;
  protocol: string;
  host: string;
}

export interface NetworkPolicy {
  enabled: boolean;
  rules: NetworkPolicyRule[];
}

interface ListQuery {
  page: string;
  size: string;
  ids?: string; // optional field forbids us from extending RequestQuery
}
interface GenerateQuery {
  jobParams: string;
}
interface GenerateExportTypePayload {
  jobParams: string;
}
interface DownloadParams {
  docId: string;
}

/*
 * Legacy System
 */

export type ReportingPluginSpecOptions = Legacy.PluginSpecOptions;

export type ServerFacade = Legacy.Server & {
  plugins: {
    reporting?: ReportingPlugin;
    xpack_main?: XPackMainPlugin & {
      status?: any;
    };
  };
};

interface ReportingRequest {
  query: ListQuery & GenerateQuery;
  params: DownloadParams;
  payload: GenerateExportTypePayload;
  pre: {
    management: {
      jobTypes: any;
    };
    user: any;
  };
}

export type RequestFacade = ReportingRequest & Legacy.Request;

export type ResponseFacade = ResponseObject & {
  isBoom: boolean;
};

export type ReportingResponseToolkit = Legacy.ResponseToolkit;

export type ESCallCluster = CallCluster;

/*
 * Reporting Config
 */

export interface CaptureConfig {
  browser: {
    type: BrowserType;
    autoDownload: boolean;
    chromium: BrowserConfig;
  };
  maxAttempts: number;
  networkPolicy: NetworkPolicy;
  loadDelay: number;
}

export interface BrowserConfig {
  inspect: boolean;
  userDataDir: string;
  viewport: { width: number; height: number };
  disableSandbox: boolean;
  proxy: {
    enabled: boolean;
    server: string;
    bypass?: string[];
  };
}

export interface QueueConfig {
  indexInterval: string;
  pollEnabled: boolean;
  pollInterval: number;
  pollIntervalErrorMultiplier: number;
  timeout: number;
}

export interface ScrollConfig {
  duration: string;
  size: number;
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}

export interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}

export interface CryptoFactory {
  decrypt: (headers?: string) => any;
}

export interface TimeRangeParams {
  timezone: string;
  min: Date | string | number;
  max: Date | string | number;
}

// retain POST payload data, needed for async
export interface JobParamPostPayload {
  timerange: TimeRangeParams;
}

export interface JobDocPayload<JobParamsType> {
  headers?: string; // serialized encrypted headers
  jobParams: JobParamsType;
  title: string;
  type: string | null;
}

export interface JobDocOutput {
  content: string; // encoded content
  contentType: string;
}

export interface JobDocExecuted<JobParamsType> {
  jobtype: string;
  output: JobDocOutputExecuted;
  payload: JobDocPayload<JobParamsType>;
  status: string; // completed, failed, etc
}

export interface JobSource<JobParamsType> {
  _id: string;
  _source: {
    jobtype: string;
    output: JobDocOutput;
    payload: JobDocPayload<JobParamsType>;
    status: string; // completed, failed, etc
  };
}

/*
 * A snake_cased field is the only significant difference in structure of
 * JobDocOutputExecuted vs JobDocOutput.
 *
 * JobDocOutput is the structure of the object returned by getDocumentPayload
 *
 * data in the _source fields of the
 * Reporting index.
 *
 * The ESQueueWorker internals have executed job objects returned with this
 * structure. See `_formatOutput` in reporting/server/lib/esqueue/worker.js
 */
export interface JobDocOutputExecuted {
  content_type: string; // vs `contentType` above
  content: string | null; // defaultOutput is null
  max_size_reached: boolean;
  size: number;
}

export interface ESQueueWorker {
  on: (event: string, handler: any) => void;
}

export type ESQueueCreateJobFn<JobParamsType> = (
  jobParams: JobParamsType,
  headers: Record<string, string>,
  request: RequestFacade
) => Promise<JobParamsType>;

export type ImmediateCreateJobFn<JobParamsType> = (
  jobParams: JobParamsType,
  headers: Record<string, string>,
  req: RequestFacade
) => Promise<{
  type: string | null;
  title: string;
  jobParams: JobParamsType;
}>;

export type ESQueueWorkerExecuteFn<JobDocPayloadType> = (
  jobId: string,
  job: JobDocPayloadType,
  cancellationToken?: CancellationToken
) => void;

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the CreateFn
 */
export type ImmediateExecuteFn<JobParamsType> = (
  jobId: null,
  job: JobDocPayload<JobParamsType>,
  request: RequestFacade
) => Promise<JobDocOutputExecuted>;

export interface ESQueueWorkerOptions {
  kibanaName: string;
  kibanaId: string;
  interval: number;
  intervalErrorMultiplier: number;
}

// GenericWorkerFn is a generic for ImmediateExecuteFn<JobParamsType> | ESQueueWorkerExecuteFn<JobDocPayloadType>,
type GenericWorkerFn<JobParamsType> = (
  jobSource: JobSource<JobParamsType>,
  ...workerRestArgs: any[]
) => void | Promise<JobDocOutputExecuted>;

export interface ESQueueInstance<JobParamsType, JobDocPayloadType> {
  registerWorker: (
    pluginId: string,
    workerFn: GenericWorkerFn<JobParamsType>,
    workerOptions: ESQueueWorkerOptions
  ) => ESQueueWorker;
}

export type CreateJobFactory<CreateJobFnType> = (server: ServerFacade) => CreateJobFnType;
export type ExecuteJobFactory<ExecuteJobFnType> = (server: ServerFacade) => ExecuteJobFnType;

export interface ExportTypeDefinition<
  JobParamsType,
  CreateJobFnType,
  JobPayloadType,
  ExecuteJobFnType
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFactory: CreateJobFactory<CreateJobFnType>;
  executeJobFactory: ExecuteJobFactory<ExecuteJobFnType>;
  validLicenses: string[];
}

export interface ExportTypesRegistry {
  register: <JobParamsType, CreateJobFnType, JobPayloadType, ExecuteJobFnType>(
    exportTypeDefinition: ExportTypeDefinition<
      JobParamsType,
      CreateJobFnType,
      JobPayloadType,
      ExecuteJobFnType
    >
  ) => void;
}

export { CancellationToken } from './common/cancellation_token';

// Prefer to import this type using: `import { LevelLogger } from 'relative/path/server/lib';`
export { LevelLogger as Logger } from './server/lib/level_logger';

export interface AbsoluteURLFactoryOptions {
  defaultBasePath: string;
  protocol: string;
  hostname: string;
  port: string | number;
}
