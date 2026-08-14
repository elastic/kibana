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

/**
 * Returns the merged AWS service matrix, deriving managed_integration, signalType,
 * inputs, requiredConfig, mandatoryFields, defaultEnabled, and identityFederationSupported
 * from the Fleet package manifests for all packages. Returns undefined while any manifest
 * is still loading.
 */
export function useAwsServiceMatrix(): AwsServiceMatrixEntry[] | undefined {
  const { data: awsData } = useGetPackageInfoByKeyQuery('aws', undefined, { full: true });
  const { data: bedrockData } = useGetPackageInfoByKeyQuery('aws_bedrock', undefined, {
    full: true,
  });
  const { data: bedrockAgentcoreData } = useGetPackageInfoByKeyQuery(
    'aws_bedrock_agentcore',
    undefined,
    { full: true }
  );
  const { data: fargateData } = useGetPackageInfoByKeyQuery('awsfargate', undefined, {
    full: true,
  });
  const { data: mqData } = useGetPackageInfoByKeyQuery('aws_mq', undefined, { full: true });
  const { data: cloudtrailOtelData } = useGetPackageInfoByKeyQuery(
    'aws_cloudtrail_otel',
    undefined,
    { full: true }
  );
  const { data: vpcflowOtelData } = useGetPackageInfoByKeyQuery('aws_vpcflow_otel', undefined, {
    full: true,
  });
  const { data: wafOtelData } = useGetPackageInfoByKeyQuery('aws_waf_otel', undefined, {
    full: true,
  });
  const { data: logsData } = useGetPackageInfoByKeyQuery('aws_logs', undefined, { full: true });

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
