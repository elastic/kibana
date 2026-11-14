/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

import {
  AWS_SERVICES_STATIC,
  buildAwsServiceMatrix,
} from '../../../common/services/aws_onboarding_catalog';
import type { AwsServiceMatrixEntry } from '../../../common/services/aws_onboarding_catalog';
import type { PackageInfo } from '../../../common/types';
import { appContextService } from '../../services/app_context';
import { getPackageInfo } from '../../services/epm/packages/get';

/** Builds the catalog from the live `aws` package metadata, scoped to the workflow's fake request. */
export const loadAwsServiceMatrix = async (
  context: StepHandlerContext
): Promise<{
  packageVersion: string;
  packageInfo: PackageInfo;
  matrix: AwsServiceMatrixEntry[];
}> => {
  const savedObjectsClient = appContextService.getInternalUserSOClient(
    context.contextManager.getFakeRequest()
  );
  const packageInfo = await getPackageInfo({
    savedObjectsClient,
    pkgName: 'aws',
    pkgVersion: '',
    skipArchive: true,
  });
  return {
    packageVersion: packageInfo.version,
    packageInfo,
    matrix: buildAwsServiceMatrix({ aws: packageInfo }, AWS_SERVICES_STATIC),
  };
};

export const isAgentless = (entry: AwsServiceMatrixEntry): boolean =>
  entry.deploymentMethods.some(({ method }) => method === 'managed_integration');
