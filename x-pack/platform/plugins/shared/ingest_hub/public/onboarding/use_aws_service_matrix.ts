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
 * from Fleet package manifests. Gated only on the core `aws` package — secondary packages
 * (aws_bedrock, awsfargate, etc.) are optional: if unavailable (technical-preview, air-gapped,
 * fetch error) those entries fall back to their static definitions.
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
  const { data: logsData } = useGetPackageInfoByKeyQuery(
    'aws_logs',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );

  return useMemo(() => {
    if (!awsData?.item) {
      return undefined;
    }
    const packages: Record<string, PackageInfo> = {
      aws: awsData.item,
      ...(bedrockData?.item && { aws_bedrock: bedrockData.item }),
      ...(bedrockAgentcoreData?.item && { aws_bedrock_agentcore: bedrockAgentcoreData.item }),
      ...(fargateData?.item && { awsfargate: fargateData.item }),
      ...(mqData?.item && { aws_mq: mqData.item }),
      ...(logsData?.item && { aws_logs: logsData.item }),
    };
    return buildAwsServiceMatrix(packages, AWS_SERVICES_STATIC);
  }, [awsData, bedrockData, bedrockAgentcoreData, fargateData, mqData, logsData]);
}

export function useAwsServicesMap(): Map<string, AwsServiceMatrixEntry> | undefined {
  const matrix = useAwsServiceMatrix();
  return useMemo(() => (matrix ? new Map(matrix.map((s) => [s.id, s])) : undefined), [matrix]);
}
