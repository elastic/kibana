/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation } from '../../../common/types/annotations';
import { DslName, AggFieldNamePair } from '../../../common/types/fields';
import { ExistingJobsAndGroups } from '../job_service';
import { PrivilegesResponse } from '../../../common/types/privileges';

// TODO This is not a complete representation of all methods of `ml.*`.
// It just satisfies needs for other parts of the code area which use
// TypeScript and rely on the methods typed in here.
// This allows the import of `ml` into TypeScript code.
interface EsIndex {
  name: string;
}

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

declare interface Ml {
  annotations: {
    deleteAnnotation(id: string | undefined): Promise<any>;
    indexAnnotation(annotation: Annotation): Promise<object>;
  };

  dataFrame: {
    getDataFrameTransforms(jobId?: string): Promise<any>;
    getDataFrameTransformsStats(jobId?: string): Promise<any>;
    createDataFrameTransform(jobId: string, jobConfig: any): Promise<any>;
    deleteDataFrameTransform(jobId: string): Promise<any>;
    getDataFrameTransformsPreview(payload: any): Promise<any>;
    startDataFrameTransform(jobId: string, force?: boolean): Promise<any>;
    stopDataFrameTransform(
      jobId: string,
      force?: boolean,
      waitForCompletion?: boolean
    ): Promise<any>;
    getTransformAuditMessages(transformId: string): Promise<any>;
  };

  hasPrivileges(obj: object): Promise<any>;

  checkMlPrivileges(): Promise<PrivilegesResponse>;
  getJobStats(obj: object): Promise<any>;
  getDatafeedStats(obj: object): Promise<any>;
  esSearch(obj: object): any;
  getIndices(): Promise<EsIndex[]>;

  getTimeFieldRange(obj: object): Promise<GetTimeFieldRangeResponse>;
  calculateModelMemoryLimit(obj: object): Promise<{ modelMemoryLimit: string }>;
  calendars(): Promise<
    Array<{
      calendar_id: string;
      description: string;
      events: any[];
      job_ids: string[];
    }>
  >;

  jobs: {
    jobsSummary(jobIds: string[]): Promise<object>;
    jobs(jobIds: string[]): Promise<object>;
    groups(): Promise<object>;
    updateGroups(updatedJobs: string[]): Promise<object>;
    forceStartDatafeeds(datafeedIds: string[], start: string, end: string): Promise<object>;
    stopDatafeeds(datafeedIds: string[]): Promise<object>;
    deleteJobs(jobIds: string[]): Promise<object>;
    closeJobs(jobIds: string[]): Promise<object>;
    jobAuditMessages(jobId: string, from: string): Promise<object>;
    deletingJobTasks(): Promise<object>;
    newJobCaps(indexPatternTitle: string, isRollup: boolean): Promise<object>;
    newJobLineChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string | null,
      splitFieldValue: string | null
    ): Promise<any>;
    newJobPopulationsChart(
      indexPatternTitle: string,
      timeField: string,
      start: number,
      end: number,
      intervalMs: number,
      query: object,
      aggFieldNamePairs: AggFieldNamePair[],
      splitFieldName: string
    ): Promise<any>;
    getAllJobAndGroupIds(): Promise<ExistingJobsAndGroups>;
    getLookBackProgress(
      jobId: string,
      start: number,
      end: number
    ): Promise<{ progress: number; isRunning: boolean }>;
  };
}

declare const ml: Ml;
