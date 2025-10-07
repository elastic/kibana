/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, ToastsStart } from '@kbn/core/public';
import type { DATAFEED_STATE } from '@kbn/ml-common-constants/states';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { MlApi } from '@kbn/ml-services/ml_api_service';

export function loadFullJob(mlApi: MlApi, jobId: string): Promise<CombinedJobWithStats>;
export function loadJobForCloning(mlApi: MlApi, jobId: string): Promise<any>;
export function isStartable(jobs: CombinedJobWithStats[]): boolean;
export function isClosable(jobs: CombinedJobWithStats[]): boolean;
export function isResettable(jobs: CombinedJobWithStats[]): boolean;
export function forceStartDatafeeds(
  toastNotifications: ToastsStart,
  mlApi: MlApi,
  jobs: CombinedJobWithStats[],
  start: number | undefined,
  end: number | undefined,
  finish?: () => void
): Promise<void>;
export function stopDatafeeds(
  toastNotifications: ToastsStart,
  mlApi: MlApi,
  jobs: CombinedJobWithStats[] | MlSummaryJob[],
  finish?: () => void
): Promise<void>;
export function showResults(
  toastNotifications: ToastsStart,
  resp: any,
  action: DATAFEED_STATE
): void;
export function cloneJob(
  toastNotifications: ToastsStart,
  application: ApplicationStart,
  mlApi: MlApi,
  jobId: string
): Promise<void>;
export function closeJobs(
  toastNotifications: ToastsStart,
  mlApi: MlApi,
  jobs: CombinedJobWithStats[] | MlSummaryJob[],
  finish?: () => void
): Promise<void>;
export function deleteJobs(
  toastNotifications: ToastsStart,
  mlApi: MlApi,
  jobs: Array<{ id: string }>,
  deleteUserAnnotations?: boolean,
  deleteAlertingRules?: boolean,
  finish?: () => void
): Promise<void>;
export function resetJobs(
  toastNotifications: ToastsStart,
  mlApi: MlApi,
  jobIds: string[],
  deleteUserAnnotations?: boolean,
  finish?: () => void
): Promise<void>;
export function filterJobs(
  jobs: CombinedJobWithStats[],
  clauses: Array<{ field: string; match: string; type: string; value: any }>
): CombinedJobWithStats[];
export function jobProperty(job: CombinedJobWithStats, prop: string): any;
export function jobTagFilter(jobs: CombinedJobWithStats[], value: string): CombinedJobWithStats[];
