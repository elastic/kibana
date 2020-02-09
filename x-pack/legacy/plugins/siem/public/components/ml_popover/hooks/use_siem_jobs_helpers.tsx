/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AugmentedSiemJobFields,
  JobSummary,
  Module,
  ModuleJob,
  RecognizerModule,
  SiemJob,
} from '../types';
import { mlModules } from '../ml_modules';

/**
 * Helper function for converting from ModuleJob -> SiemJob
 * @param module
 * @param moduleJob
 * @param isCompatible
 */
export const moduleToSiemJob = (
  module: Module,
  moduleJob: ModuleJob,
  isCompatible: boolean
): SiemJob => {
  return {
    datafeedId: '',
    datafeedIndices: [],
    datafeedState: '',
    hasDatafeed: false,
    isSingleMetricViewerJob: false,
    jobState: '',
    memory_status: '',
    processed_record_count: 0,
    id: moduleJob.id,
    description: moduleJob.config.description,
    groups: [...moduleJob.config.groups].sort(),
    defaultIndexPattern: module.defaultIndexPattern,
    moduleId: module.id,
    isCompatible,
    isInstalled: false,
    isElasticJob: true,
  };
};

/**
 * Returns fields necessary to augment a ModuleJob to a SiemJob
 *
 * @param jobId
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getAugmentedFields = (
  jobId: string,
  moduleJobs: SiemJob[],
  compatibleModuleIds: string[]
): AugmentedSiemJobFields => {
  const moduleJob = moduleJobs.find(mj => mj.id === jobId);
  return moduleJob !== undefined
    ? {
        moduleId: moduleJob.moduleId,
        defaultIndexPattern: moduleJob.defaultIndexPattern,
        isCompatible: compatibleModuleIds.includes(moduleJob.moduleId),
        isElasticJob: true,
      }
    : {
        moduleId: '',
        defaultIndexPattern: '',
        isCompatible: true,
        isElasticJob: false,
      };
};

/**
 * Process Modules[] from the `get_module` ML API into SiemJobs[] by filtering to SIEM specific
 * modules and unpacking jobs from each module
 *
 * @param modulesData
 * @param compatibleModuleIds
 */
export const getModuleJobs = (modulesData: Module[], compatibleModuleIds: string[]): SiemJob[] =>
  modulesData
    .filter(module => mlModules.includes(module.id))
    .map(module => [
      ...module.jobs.map(moduleJob =>
        moduleToSiemJob(module, moduleJob, compatibleModuleIds.includes(module.id))
      ),
    ])
    .flat();

/**
 * Process JobSummary[] from the `jobs_summary` ML API into SiemJobs[] by filtering to to SIEM jobs
 * and augmenting with moduleId/defaultIndexPattern/isCompatible
 *
 * @param jobSummaryData
 * @param moduleJobs
 * @param compatibleModuleIds
 */
export const getInstalledJobs = (
  jobSummaryData: JobSummary[],
  moduleJobs: SiemJob[],
  compatibleModuleIds: string[]
): SiemJob[] =>
  jobSummaryData
    .filter(({ groups }) => groups.includes('siem'))
    .map<SiemJob>(jobSummary => ({
      ...jobSummary,
      ...getAugmentedFields(jobSummary.id, moduleJobs, compatibleModuleIds),
      isInstalled: true,
    }));

/**
 * Combines installed jobs + moduleSiemJobs that don't overlap and sorts by name asc
 *
 * @param installedJobs
 * @param moduleSiemJobs
 */
export const composeModuleAndInstalledJobs = (
  installedJobs: SiemJob[],
  moduleSiemJobs: SiemJob[]
): SiemJob[] => {
  const installedJobsIds = installedJobs.map(installedJob => installedJob.id);

  return [
    ...installedJobs,
    ...moduleSiemJobs.filter(mj => !installedJobsIds.includes(mj.id)),
  ].sort((a, b) => a.id.localeCompare(b.id));
};
/**
 * Creates a list of SiemJobs by composing JobSummary jobs (installed jobs) and Module
 * jobs (pre-packaged SIEM jobs) into a single job object that can be used throughout the SIEM app
 *
 * @param jobSummaryData
 * @param modulesData
 * @param compatibleModules
 */
export const createSiemJobs = (
  jobSummaryData: JobSummary[],
  modulesData: Module[],
  compatibleModules: RecognizerModule[]
): SiemJob[] => {
  // Create lookup of compatible modules
  const compatibleModuleIds = compatibleModules.map(module => module.id);

  // Process modulesData: Filter to SIEM specific modules, and unpack jobs from modules
  const moduleSiemJobs = getModuleJobs(modulesData, compatibleModuleIds);

  // Process jobSummaryData: Filter to SIEM jobs, and augment with moduleId/defaultIndexPattern/isCompatible
  const installedJobs = getInstalledJobs(jobSummaryData, moduleSiemJobs, compatibleModuleIds);

  // Combine installed jobs + moduleSiemJobs that don't overlap, and sort by name asc
  return composeModuleAndInstalledJobs(installedJobs, moduleSiemJobs);
};
