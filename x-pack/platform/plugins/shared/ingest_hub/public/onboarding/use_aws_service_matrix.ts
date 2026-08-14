/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';

import { AWS_SERVICES_STATIC, buildAwsServiceMatrix } from './aws_service_matrix';
import type { AwsServiceMatrixEntry } from './aws_service_matrix';

/**
 * Returns the merged AWS service matrix, deriving managed_integration, signalType,
 * and inputs from the Fleet package manifest. Returns undefined while the manifest is loading.
 */
export function useAwsServiceMatrix(): AwsServiceMatrixEntry[] | undefined {
  const { data: awsPackageResponse } = useGetPackageInfoByKeyQuery('aws', undefined, {
    full: true,
  });

  return useMemo(() => {
    if (!awsPackageResponse?.item) {
      return undefined;
    }
    return buildAwsServiceMatrix(awsPackageResponse.item, AWS_SERVICES_STATIC);
  }, [awsPackageResponse]);
}

export function useAwsServicesMap(): Map<string, AwsServiceMatrixEntry> | undefined {
  const matrix = useAwsServiceMatrix();
  return useMemo(() => (matrix ? new Map(matrix.map((s) => [s.id, s])) : undefined), [matrix]);
}
