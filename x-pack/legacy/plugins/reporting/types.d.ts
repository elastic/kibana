/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { ResponseObject } from 'hapi';
import { Legacy } from 'kibana';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { CallCluster } from '../../../../src/legacy/core_plugins/elasticsearch';
import { CancellationToken } from './common/cancellation_token';
import { HeadlessChromiumDriverFactory } from './server/browsers/chromium/driver_factory';
import { BrowserType } from './server/browsers/types';
import { LevelLogger } from './server/lib/level_logger';
import { ReportingCore } from './server/core';
import { LegacySetup, ReportingStartDeps, ReportingSetup, ReportingStart } from './server/types';

export type Job = EventEmitter & {
  id: string;
  toJSON: () => {
    id: string;
  };
};

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

export interface ListQuery {
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

/*
 * Legacy System
 * TODO: move to server/types
 */

export type ServerFacade = LegacySetup;

export type ReportingPluginSpecOptions = Legacy.PluginSpecOptions;

export type EnqueueJobFn = <JobParamsType>(
  exportTypeId: string,
  jobParams: JobParamsType,
  user: string,
  headers: Record<string, string>,
  request: RequestFacade
) => Promise<Job>;

export type ReportingRequestPayload = GenerateExportTypePayload | JobParamPostPayload;
export type ReportingRequestQuery = ListQuery | GenerateQuery;

export interface ReportingRequestPre {
  management: {
    jobTypes: any;
  };
  user: any; // TODO import AuthenticatedUser from security/server
}

export interface RequestFacade {
  getBasePath: Legacy.Request['getBasePath'];
  getSavedObjectsClient: Legacy.Request['getSavedObjectsClient'];
  headers: Legacy.Request['headers'];
  params: Legacy.Request['params'];
  payload: JobParamPostPayload | GenerateExportTypePayload;
  query: ReportingRequestQuery;
  route: Legacy.Request['route'];
  pre: ReportingRequestPre;
  getRawRequest: () => Legacy.Request;
}

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

export interface IndexPatternSavedObject {
  attributes: {
    fieldFormatMap: string;
  };
  id: string;
  type: string;
  version: string;
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

export interface JobSource<JobParamsType> {
  _id: string;
  _source: {
    jobtype: string;
    output: JobDocOutput;
    payload: JobDocPayload<JobParamsType>;
    status: string; // completed, failed, etc
  };
}

export interface JobDocOutput {
  content_type: string;
  content: string | null;
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
) => Promise<JobDocOutput>;

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
) => void | Promise<JobDocOutput>;

export interface ESQueueInstance {
  addJob: (type: string, payload: unknown, options: object) => Job;
  registerWorker: <JobParamsType>(
    pluginId: string,
    workerFn: GenericWorkerFn<JobParamsType>,
    workerOptions: ESQueueWorkerOptions
  ) => ESQueueWorker;
}

export type CreateJobFactory<CreateJobFnType> = (
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  logger: LevelLogger
) => CreateJobFnType;
export type ExecuteJobFactory<ExecuteJobFnType> = (
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  logger: LevelLogger
) => Promise<ExecuteJobFnType>;

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

export { CancellationToken } from './common/cancellation_token';

export { HeadlessChromiumDriver, HeadlessChromiumDriverFactory } from './server/browsers';

export { ExportTypesRegistry } from './server/lib/export_types_registry';
// Prefer to import this type using: `import { LevelLogger } from 'relative/path/server/lib';`
export { LevelLogger as Logger };

export interface AbsoluteURLFactoryOptions {
  defaultBasePath: string;
  protocol: string;
  hostname: string;
  port: string | number;
}

export interface InterceptedRequest {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: {
      [key: string]: string;
    };
    initialPriority: string;
    referrerPolicy: string;
  };
  frameId: string;
  resourceType: string;
}
