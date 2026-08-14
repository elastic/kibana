/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';

import { AWS_SERVICES_STATIC, buildAwsServiceMatrix } from './aws_service_matrix';
import type { AwsServiceMatrixEntry } from './aws_service_matrix';

const PACKAGE_QUERY_OPTIONS = { full: true };
// Package manifests change only on new releases; 10 min cache avoids repeated EPR requests.
const CACHE_OPTS = { staleTime: 10 * 60 * 1000 };

/**
 * Returns the merged AWS service matrix, deriving managed_integration, signalType,
 * inputs, requiredConfig, mandatoryFields, defaultEnabled, and identityFederationSupported
 * from the Fleet package manifests for all packages. Returns undefined while any manifest
 * is still loading.
 */
export function useAwsServiceMatrix(): AwsServiceMatrixEntry[] | undefined {
  const { data: awsData } = useGetPackageInfoByKeyQuery(
    'aws',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: bedrockData } = useGetPackageInfoByKeyQuery(
    'aws_bedrock',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: bedrockAgentcoreData } = useGetPackageInfoByKeyQuery(
    'aws_bedrock_agentcore',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: fargateData } = useGetPackageInfoByKeyQuery(
    'awsfargate',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: mqData } = useGetPackageInfoByKeyQuery(
    'aws_mq',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: cloudtrailOtelData } = useGetPackageInfoByKeyQuery(
    'aws_cloudtrail_otel',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: vpcflowOtelData } = useGetPackageInfoByKeyQuery(
    'aws_vpcflow_otel',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: wafOtelData } = useGetPackageInfoByKeyQuery(
    'aws_waf_otel',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const { data: logsData } = useGetPackageInfoByKeyQuery(
    'aws_logs',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );

  return useMemo(() => {
    if (
      !awsData?.item ||
      !bedrockData?.item ||
      !bedrockAgentcoreData?.item ||
      !fargateData?.item ||
      !mqData?.item ||
      !cloudtrailOtelData?.item ||
      !vpcflowOtelData?.item ||
      !wafOtelData?.item ||
      !logsData?.item
    ) {
      return undefined;
    }
    const packages: Record<string, PackageInfo> = {
      aws: awsData.item,
      aws_bedrock: bedrockData.item,
      aws_bedrock_agentcore: bedrockAgentcoreData.item,
      awsfargate: fargateData.item,
      aws_mq: mqData.item,
      aws_cloudtrail_otel: cloudtrailOtelData.item,
      aws_vpcflow_otel: vpcflowOtelData.item,
      aws_waf_otel: wafOtelData.item,
      aws_logs: logsData.item,
    };
    return buildAwsServiceMatrix(packages, AWS_SERVICES_STATIC);
  }, [
    awsData,
    bedrockData,
    bedrockAgentcoreData,
    fargateData,
    mqData,
    cloudtrailOtelData,
    vpcflowOtelData,
    wafOtelData,
    logsData,
  ]);
}

export function useAwsServicesMap(): Map<string, AwsServiceMatrixEntry> | undefined {
  const matrix = useAwsServiceMatrix();
  return useMemo(() => (matrix ? new Map(matrix.map((s) => [s.id, s])) : undefined), [matrix]);
}
