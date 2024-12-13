/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  EcsMappingRequestBody,
  EcsMappingResponse,
  CategorizationRequestBody,
  CategorizationResponse,
  RelatedRequestBody,
  RelatedResponse,
  CheckPipelineRequestBody,
  CheckPipelineResponse,
  BuildIntegrationRequestBody,
  AnalyzeLogsRequestBody,
  AnalyzeLogsResponse,
  CelInputRequestBody,
  CelInputResponse,
  AnalyzeApiRequestBody,
  AnalyzeApiResponse,
} from '../../../common';
import {
  INTEGRATION_BUILDER_PATH,
  ECS_GRAPH_PATH,
  CATEGORIZATION_GRAPH_PATH,
  RELATED_GRAPH_PATH,
  CEL_INPUT_GRAPH_PATH,
  CHECK_PIPELINE_PATH,
} from '../../../common';
import {
  ANALYZE_API_PATH,
  ANALYZE_LOGS_PATH,
  FLEET_PACKAGES_PATH,
} from '../../../common/constants';

export interface EpmPackageResponse {
  items: [{ id: string; type: string }];
}

const defaultHeaders = {
  'Elastic-Api-Version': '1',
};
const fleetDefaultHeaders = {
  'Elastic-Api-Version': '2023-10-31',
};

export interface RequestDeps {
  http: HttpSetup;
  abortSignal: AbortSignal;
}

export const runAnalyzeApiGraph = async (
  body: AnalyzeApiRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<AnalyzeApiResponse> =>
  http.post<AnalyzeApiResponse>(ANALYZE_API_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runAnalyzeLogsGraph = async (
  body: AnalyzeLogsRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<AnalyzeLogsResponse> =>
  http.post<AnalyzeLogsResponse>(ANALYZE_LOGS_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runEcsGraph = async (
  body: EcsMappingRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<EcsMappingResponse> =>
  http.post<EcsMappingResponse>(ECS_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCategorizationGraph = async (
  body: CategorizationRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<CategorizationResponse> =>
  http.post<CategorizationResponse>(CATEGORIZATION_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runRelatedGraph = async (
  body: RelatedRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<RelatedResponse> =>
  http.post<RelatedResponse>(RELATED_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCelGraph = async (
  body: CelInputRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<CelInputResponse> =>
  http.post<CelInputResponse>(CEL_INPUT_GRAPH_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runCheckPipelineResults = async (
  body: CheckPipelineRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<CheckPipelineResponse> =>
  http.post<CheckPipelineResponse>(CHECK_PIPELINE_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runBuildIntegration = async (
  body: BuildIntegrationRequestBody,
  { http, abortSignal }: RequestDeps
): Promise<Blob> =>
  http.post<Blob>(INTEGRATION_BUILDER_PATH, {
    headers: defaultHeaders,
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runInstallPackage = async (
  zipFile: Blob,
  { http, abortSignal }: RequestDeps
): Promise<EpmPackageResponse> =>
  http.post<EpmPackageResponse>(FLEET_PACKAGES_PATH, {
    headers: {
      ...fleetDefaultHeaders,
      Accept: 'application/zip',
      'Content-Type': 'application/zip',
    },
    body: zipFile,
    signal: abortSignal,
  });

export const getInstalledPackages = async ({
  http,
  abortSignal,
}: RequestDeps): Promise<EpmPackageResponse> =>
  http.get<EpmPackageResponse>(FLEET_PACKAGES_PATH, {
    headers: fleetDefaultHeaders,
    query: { prerelease: true },
    signal: abortSignal,
  });
