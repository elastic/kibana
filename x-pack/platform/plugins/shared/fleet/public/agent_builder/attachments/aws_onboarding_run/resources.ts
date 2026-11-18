/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** The resources the identity blueprint always creates, in creation order. */
export const KNOWN_STACK_RESOURCES: ReadonlyArray<{ logicalId: string; label: string }> = [
  {
    logicalId: 'WiiOidcProviderFunctionLogGroup',
    label: i18n.translate('xpack.fleet.awsOnboardingStackCard.resource.logGroup', {
      defaultMessage: 'Log group',
    }),
  },
  {
    logicalId: 'WiiOidcProviderFunctionRole',
    label: i18n.translate('xpack.fleet.awsOnboardingStackCard.resource.providerFunctionRole', {
      defaultMessage: 'Provider function role',
    }),
  },
  {
    logicalId: 'WiiOidcProviderFunction',
    label: i18n.translate('xpack.fleet.awsOnboardingStackCard.resource.providerFunction', {
      defaultMessage: 'Provider function',
    }),
  },
  {
    logicalId: 'WiiOidcProvider',
    label: i18n.translate('xpack.fleet.awsOnboardingStackCard.resource.oidcProvider', {
      defaultMessage: 'OIDC provider',
    }),
  },
  {
    logicalId: 'ElasticWorkloadIdentityRole',
    label: i18n.translate('xpack.fleet.awsOnboardingStackCard.resource.workloadIdentityRole', {
      defaultMessage: 'Workload identity role',
    }),
  },
];
