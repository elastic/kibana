/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useGetFleetServerHosts } from '../../../hooks';
import type { AzureArmTemplateProps } from '../../agent_enrollment_flyout/types';

const ARM_TEMPLATE_DEFAULT_ACCOUNT_TYPE = 'single-account';

export const useCreateAzureArmTemplateUrl = ({
  enrollmentAPIKey,
  azureArmTemplateProps,
}: {
  enrollmentAPIKey: string | undefined;
  azureArmTemplateProps: AzureArmTemplateProps | undefined;
}) => {
  const { data, isLoading } = useGetFleetServerHosts();

  let isError = false;
  let error: string | undefined;

  // Default fleet server host
  const fleetServerHost = data?.items?.find((item) => item.is_default)?.host_urls?.[0];

  if (!fleetServerHost && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noFleetServerHost', {
      defaultMessage: 'No Fleet Server host found',
    });
  }

  if (!enrollmentAPIKey && !isLoading) {
    isError = true;
    error = i18n.translate('xpack.fleet.agentEnrollment.cloudFormation.noApiKey', {
      defaultMessage: 'No enrollment token found',
    });
  }

  let azureArmTemplateUrl = azureArmTemplateProps?.templateUrl;

  if (azureArmTemplateUrl?.includes('ACCOUNT_TYPE')) {
    azureArmTemplateUrl = azureArmTemplateUrl.replace(
      'ACCOUNT_TYPE',
      azureArmTemplateProps?.azureAccountType || ARM_TEMPLATE_DEFAULT_ACCOUNT_TYPE
    );
  }

  return {
    isLoading,
    azureArmTemplateUrl,
    isError,
    error,
  };
};
