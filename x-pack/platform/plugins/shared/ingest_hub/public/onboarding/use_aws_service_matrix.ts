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
    isLoading: bedrockIsLoading,
    refetch: bedrockRefetch,
  } = useGetPackageInfoByKeyQuery('aws_bedrock', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: bedrockAgentcoreData,
    isLoading: bedrockAgentcoreIsLoading,
    refetch: bedrockAgentcoreRefetch,
  } = useGetPackageInfoByKeyQuery(
    'aws_bedrock_agentcore',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const {
    data: fargateData,
    isLoading: fargateIsLoading,
    refetch: fargateRefetch,
  } = useGetPackageInfoByKeyQuery('awsfargate', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: mqData,
    isLoading: mqIsLoading,
    refetch: mqRefetch,
  } = useGetPackageInfoByKeyQuery('aws_mq', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: logsData,
    isLoading: logsIsLoading,
    refetch: logsRefetch,
  } = useGetPackageInfoByKeyQuery('aws_logs', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: cloudwatchOtelData,
    isLoading: cloudwatchOtelIsLoading,
    refetch: cloudwatchOtelRefetch,
  } = useGetPackageInfoByKeyQuery(
    'aws_cloudwatch_input_otel',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const {
    data: securityHubData,
    isLoading: securityHubIsLoading,
    refetch: securityHubRefetch,
  } = useGetPackageInfoByKeyQuery('aws_securityhub', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: billingData,
    isLoading: billingIsLoading,
    refetch: billingRefetch,
  } = useGetPackageInfoByKeyQuery('aws_billing', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: firehoseData,
    isLoading: firehoseIsLoading,
    refetch: firehoseRefetch,
  } = useGetPackageInfoByKeyQuery('awsfirehose', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);
  const {
    data: securityLakeData,
    isLoading: securityLakeIsLoading,
    refetch: securityLakeRefetch,
  } = useGetPackageInfoByKeyQuery(
    'amazon_security_lake',
    undefined,
    PACKAGE_QUERY_OPTIONS,
    CACHE_OPTS
  );
  const {
    data: endaceData,
    isLoading: endaceIsLoading,
    refetch: endaceRefetch,
  } = useGetPackageInfoByKeyQuery('endace', undefined, PACKAGE_QUERY_OPTIONS, CACHE_OPTS);

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
      ...(firehoseData?.item && { awsfirehose: firehoseData.item }),
      ...(securityLakeData?.item && { amazon_security_lake: securityLakeData.item }),
      ...(endaceData?.item && { endace: endaceData.item }),
    };
    // Track packages whose queries are still in-flight so buildAwsServiceMatrix can mark those
    // entries as not yet settled (isManifestLoaded = false). Settled entries (success or error)
    // are absent, allowing the user to proceed even when a secondary manifest fails to load.
    const loadingPackageNames = new Set(
      [
        bedrockIsLoading && 'aws_bedrock',
        bedrockAgentcoreIsLoading && 'aws_bedrock_agentcore',
        fargateIsLoading && 'awsfargate',
        mqIsLoading && 'aws_mq',
        logsIsLoading && 'aws_logs',
        cloudwatchOtelIsLoading && 'aws_cloudwatch_input_otel',
        securityHubIsLoading && 'aws_securityhub',
        billingIsLoading && 'aws_billing',
        firehoseIsLoading && 'awsfirehose',
        securityLakeIsLoading && 'amazon_security_lake',
        endaceIsLoading && 'endace',
      ].filter((name): name is string => typeof name === 'string')
    );
    return buildAwsServiceMatrix(packages, AWS_SERVICES_STATIC, loadingPackageNames);
  }, [
    awsData,
    bedrockData,
    bedrockIsLoading,
    bedrockAgentcoreData,
    bedrockAgentcoreIsLoading,
    fargateData,
    fargateIsLoading,
    mqData,
    mqIsLoading,
    logsData,
    logsIsLoading,
    cloudwatchOtelData,
    cloudwatchOtelIsLoading,
    securityHubData,
    securityHubIsLoading,
    billingData,
    billingIsLoading,
    firehoseData,
    firehoseIsLoading,
    securityLakeData,
    securityLakeIsLoading,
    endaceData,
    endaceIsLoading,
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
    firehoseRefetch();
    securityLakeRefetch();
    endaceRefetch();
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
    firehoseRefetch,
    securityLakeRefetch,
    endaceRefetch,
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
