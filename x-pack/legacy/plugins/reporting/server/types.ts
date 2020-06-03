/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { ElasticsearchServiceSetup } from 'kibana/server';
import * as Rx from 'rxjs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { ReportingPluginSpecOptions } from '../';
import { CancellationToken } from '../../../../plugins/reporting/common';
import { JobStatus } from '../../../../plugins/reporting/common/types';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { LayoutInstance } from '../export_types/common/layouts';
import { ReportingConfigType } from './config';
import { ReportingCore } from './core';
import { LevelLogger } from './lib';

/*
 * Routing / API types
 */

interface ListQuery {
  page: string;
  size: string;
  ids?: string; // optional field forbids us from extending RequestQuery
}

interface GenerateQuery {
  jobParams: string;
}

export type ReportingRequestQuery = ListQuery | GenerateQuery;

export interface ReportingRequestPre {
  management: {
    jobTypes: any;
  };
  user: string;
}

// generate a report with unparsed jobParams
export interface GenerateExportTypePayload {
  jobParams: string;
}

export type ReportingRequestPayload = GenerateExportTypePayload | JobParamPostPayload;

export interface TimeRangeParams {
  timezone: string;
  min: Date | string | number | null;
  max: Date | string | number | null;
}

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
  _index: string;
  _source: {
    jobtype: string;
    output: JobDocOutput;
    payload: JobDocPayload<JobParamsType>;
    status: JobStatus;
  };
}

export interface JobDocOutput {
  content_type: string;
  content: string | null;
  size: number;
  max_size_reached?: boolean;
  warnings?: string[];
}

interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}

/*
 * Screenshots
 */

export interface ScreenshotObservableOpts {
  logger: LevelLogger;
  urls: string[];
  conditionalHeaders: ConditionalHeaders;
  layout: LayoutInstance;
  browserTimezone: string;
}

export interface AttributesMap {
  [key: string]: any;
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

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export interface Screenshot {
  base64EncodedData: string;
  title: string;
  description: string;
}

export interface ScreenshotResults {
  timeRange: string | null;
  screenshots: Screenshot[];
  error?: Error;
  elementsPositionAndAttributes?: ElementsPositionAndAttribute[]; // NOTE: for testing
}

export type ScreenshotsObservableFn = ({
  logger,
  urls,
  conditionalHeaders,
  layout,
  browserTimezone,
}: ScreenshotObservableOpts) => Rx.Observable<ScreenshotResults[]>;

/*
 * Plugin Contract
 */

export interface ReportingSetupDeps {
  elasticsearch: ElasticsearchServiceSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
  __LEGACY: LegacySetup;
}

export interface ReportingStartDeps {
  data: DataPluginStart;
  __LEGACY: LegacySetup;
}

export type ReportingStart = object;
export type ReportingSetup = object;

export interface LegacySetup {
  plugins: {
    xpack_main: XPackMainPlugin & {
      status?: any;
    };
    reporting: ReportingPluginSpecOptions;
  };
  route: Legacy.Server['route'];
}

/*
 * Internal Types
 */

export type ESQueueCreateJobFn<JobParamsType> = (
  jobParams: JobParamsType,
  context: RequestHandlerContext,
  request: KibanaRequest
) => Promise<JobParamsType>;

export type ESQueueWorkerExecuteFn<JobDocPayloadType> = (
  jobId: string,
  job: JobDocPayloadType,
  cancellationToken?: CancellationToken
) => Promise<any>;

export type ServerFacade = LegacySetup;

export type CaptureConfig = ReportingConfigType['capture'];
export type ScrollConfig = ReportingConfigType['csv']['scroll'];

export type CreateJobFactory<CreateJobFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => CreateJobFnType;

export type ExecuteJobFactory<ExecuteJobFnType> = (
  reporting: ReportingCore,
  logger: LevelLogger
) => Promise<ExecuteJobFnType>; // FIXME: does not "need" to be async

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
