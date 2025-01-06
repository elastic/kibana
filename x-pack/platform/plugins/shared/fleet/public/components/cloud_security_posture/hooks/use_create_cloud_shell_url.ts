/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackagePolicy } from '../../../../common';

import { useGetFleetServerHosts } from '../../../hooks';

import { getCloudShellUrlFromPackagePolicy } from '../services';

export const useCreateCloudShellUrl = ({
  enrollmentAPIKey,
  packagePolicy,
}: {
  enrollmentAPIKey: string | undefined;
  packagePolicy?: PackagePolicy;
}) => {
  const { data, isLoading } = useGetFleetServerHosts();

  let isError = false;
  let error: string | undefined;

  // Default fleet server host
  const fleetServerHost = data?.items?.find((item) => item.is_default)?.host_urls?.[0];

  if (!fleetServerHost && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudShell.noFleetServerHost', {
      defaultMessage: 'No Fleet Server host found',
    });
  }

  if (!enrollmentAPIKey && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudShell.noApiKey', {
      defaultMessage: 'No enrollment token found',
    });
  }

  const cloudShellUrl = getCloudShellUrlFromPackagePolicy(packagePolicy) || '';

  return {
    isLoading,
    cloudShellUrl,
    isError,
    error,
  };
};
