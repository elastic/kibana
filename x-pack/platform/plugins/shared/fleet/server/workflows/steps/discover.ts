/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingDiscoverCommonDefinition } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import { awsOnboardingDiscoveryService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { loadAwsServiceMatrix, isAgentless } from './aws_service_matrix';
import { BILLING_NAME_TO_SERVICE_ID } from './billing_name_map';

const toKebabCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const awsOnboardingDiscoverStepDefinition = createServerStepDefinition({
  ...awsOnboardingDiscoverCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const discovery = await awsOnboardingDiscoveryService.discover();
    const { matrix } = await loadAwsServiceMatrix(context);

    const services: AwsOnboardingDiscoverOutput['services'] = discovery.servicesInUse.map(
      (billingName) => {
        const serviceId = BILLING_NAME_TO_SERVICE_ID[billingName];
        const entry = serviceId ? matrix.find(({ id }) => id === serviceId) : undefined;
        if (!entry) {
          return {
            id: toKebabCase(billingName),
            name: billingName,
            billing_name: billingName,
            matched: false,
            agentless: false,
          };
        }
        return {
          id: entry.id,
          name: entry.name,
          billing_name: billingName,
          matched: true,
          agentless: isAgentless(entry),
          ...(entry.id === 'guardduty' && discovery.guarddutyDetectorIds.length > 0
            ? { detector_ids: discovery.guarddutyDetectorIds }
            : {}),
        };
      }
    );

    return {
      output: {
        account_id: discovery.accountId,
        services,
        errors: discovery.errors,
      },
    };
  },
});
