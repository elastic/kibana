/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSecurityIntegrationAzureAccountType } from '../../agent_enrollment_flyout/types';
import type { PackagePolicy } from '../../../types';
import type { AzureArmTemplateProps } from '../../agent_enrollment_flyout/types';

const AZURE_ACCOUNT_TYPE = 'azure.account_type';

/**
 * Get the Azure Arm Template url from a package policy
 * It looks for a config with an arm_template_url object present in the enabled inputs of the package policy
 */
export const getAzureArmPropsFromPackagePolicy = (
  packagePolicy?: PackagePolicy
): AzureArmTemplateProps => {
  const templateUrl: CloudSecurityIntegrationAzureAccountType | undefined =
    packagePolicy?.inputs?.find((input) => input.enabled)?.config?.arm_template_url?.value;

  const azureAccountType: CloudSecurityIntegrationAzureAccountType | undefined =
    packagePolicy?.inputs?.find((input) => input.enabled)?.streams?.[0]?.vars?.[AZURE_ACCOUNT_TYPE]
      ?.value;

  return {
    templateUrl,
    azureAccountType,
  };
};
