/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';

import { AWS_SERVICES_STATIC, buildAwsServiceMatrix } from './aws_service_matrix';
import type { AwsServiceMatrixEntry } from './aws_service_matrix';

const PACKAGE_QUERY_OPTIONS = { full: true };
// Package manifests change only on new releases; 10 min cache avoids repeated EPR requests.
const CACHE_OPTS = { staleTime: 10 * 60 * 1000 };

export interface UseAwsServiceMatrixResult {
  /** Merged matrix, or undefined while the core aws package is still loading. */
  matrix: AwsServiceMatrixEntry[] | undefined;
  /** True when the core aws package fetch failed and will not auto-retry. */
  isError: boolean;
  /** Re-trigger the core aws package fetch (and all secondary fetches). */
  refetch: () => void;
}

/**
 * Returns the merged AWS service matrix, deriving managed_integration, signalType,
 * inputs, requiredConfig, defaultEnabled, and identityFederationSupported
 * from Fleet package manifests. Gated only on the core `aws` package — secondary packages
 * (aws_bedrock, awsfargate, etc.) are optional: if unavailable (technical-preview, air-gapped,
 * fetch error) those entries fall back to their static definitions.
 */
export function useAwsServiceMatrix(): UseAwsServiceMatrixResult {
  const {
    data: awsData,
    isError: awsIsError,
    refetch: awsRefetch,
  } = useGetPackageInfoByKeyQuery('aws', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: bedrockData,
    isError: bedrockIsError,
    refetch: bedrockRefetch,
  } = useGetPackageInfoByKeyQuery('aws_bedrock', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: bedrockAgentcoreData,
    isError: bedrockAgentcoreIsError,
    refetch: bedrockAgentcoreRefetch,
  } = useGetPackageInfoByKeyQuery(
    'aws_bedrock_agentcore',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const {
    data: fargateData,
    isError: fargateIsError,
    refetch: fargateRefetch,
  } = useGetPackageInfoByKeyQuery('awsfargate', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: mqData,
    isError: mqIsError,
    refetch: mqRefetch,
  } = useGetPackageInfoByKeyQuery('aws_mq', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: logsData,
    isError: logsIsError,
    refetch: logsRefetch,
  } = useGetPackageInfoByKeyQuery('aws_logs', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: cloudwatchOtelData,
    isError: cloudwatchOtelIsError,
    refetch: cloudwatchOtelRefetch,
  } = useGetPackageInfoByKeyQuery(
    'aws_cloudwatch_input_otel',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const {
    data: securityHubData,
    isError: securityHubIsError,
    refetch: securityHubRefetch,
  } = useGetPackageInfoByKeyQuery('aws_securityhub', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: billingData,
    isError: billingIsError,
    refetch: billingRefetch,
  } = useGetPackageInfoByKeyQuery('aws_billing', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: securityLakeData,
    isError: securityLakeIsError,
    refetch: securityLakeRefetch,
  } = useGetPackageInfoByKeyQuery(
    'amazon_security_lake',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );

  const matrix = useMemo(() => {
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
      ...(cloudwatchOtelData?.item && {
        aws_cloudwatch_input_otel: cloudwatchOtelData.item,
      }),
      ...(securityHubData?.item && { aws_securityhub: securityHubData.item }),
      ...(billingData?.item && { aws_billing: billingData.item }),
      ...(securityLakeData?.item && { amazon_security_lake: securityLakeData.item }),
    };
    // Track packages whose queries have failed so buildAwsServiceMatrix can set isManifestError.
    // A failed secondary manifest blocks Next in Step 3 and surfaces a retry callout, rather than
    // silently proceeding with empty dataStreams/inputs.
    const erroredPackageNames = new Set(
      [
        bedrockIsError && !bedrockData?.item && 'aws_bedrock',
        bedrockAgentcoreIsError && !bedrockAgentcoreData?.item && 'aws_bedrock_agentcore',
        fargateIsError && !fargateData?.item && 'awsfargate',
        mqIsError && !mqData?.item && 'aws_mq',
        logsIsError && !logsData?.item && 'aws_logs',
        cloudwatchOtelIsError && !cloudwatchOtelData?.item && 'aws_cloudwatch_input_otel',
        securityHubIsError && !securityHubData?.item && 'aws_securityhub',
        billingIsError && !billingData?.item && 'aws_billing',
        securityLakeIsError && !securityLakeData?.item && 'amazon_security_lake',
      ].filter((name): name is string => typeof name === 'string')
    );
    return buildAwsServiceMatrix(packages, AWS_SERVICES_STATIC, erroredPackageNames);
  }, [
    awsData,
    bedrockData,
    bedrockIsError,
    bedrockAgentcoreData,
    bedrockAgentcoreIsError,
    fargateData,
    fargateIsError,
    mqData,
    mqIsError,
    logsData,
    logsIsError,
    cloudwatchOtelData,
    cloudwatchOtelIsError,
    securityHubData,
    securityHubIsError,
    billingData,
    billingIsError,
    securityLakeData,
    securityLakeIsError,
  ]);

  const refetch = useCallback(() => {
    awsRefetch();
    bedrockRefetch();
    bedrockAgentcoreRefetch();
    fargateRefetch();
    mqRefetch();
    logsRefetch();
    cloudwatchOtelRefetch();
    securityHubRefetch();
    billingRefetch();
    securityLakeRefetch();
  }, [
    awsRefetch,
    bedrockRefetch,
    bedrockAgentcoreRefetch,
    fargateRefetch,
    mqRefetch,
    logsRefetch,
    cloudwatchOtelRefetch,
    securityHubRefetch,
    billingRefetch,
    securityLakeRefetch,
  ]);

  return { matrix, isError: awsIsError, refetch };
}

export function useAwsServicesMap():
  | { map: Map<string, AwsServiceMatrixEntry>; isError: false; refetch: () => void }
  | { map: undefined; isError: boolean; refetch: () => void } {
  const { matrix, isError, refetch } = useAwsServiceMatrix();
  const map = useMemo(() => (matrix ? new Map(matrix.map((s) => [s.id, s])) : undefined), [matrix]);
  return { map, isError, refetch } as ReturnType<typeof useAwsServicesMap>;
}
