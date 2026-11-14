/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingDiscoverCommonDefinition } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import { FleetNotFoundError } from '../../errors';
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

    let discovery: Awaited<ReturnType<typeof awsOnboardingDiscoveryService.discover>>;
    try {
      discovery = await awsOnboardingDiscoveryService.discover();
    } catch (error) {
      if (error instanceof FleetNotFoundError) {
        return {
          error: new ExecutionError({
            type: 'ValidationError',
            message: 'AWS onboarding credentials are not configured. Set them up first.',
          }),
        };
      }
      return { error };
    }

    let matrix: Awaited<ReturnType<typeof loadAwsServiceMatrix>>['matrix'];
    try {
      ({ matrix } = await loadAwsServiceMatrix(context));
    } catch (error) {
      return {
        error: new ExecutionError({
          type: 'ValidationError',
          message: `The aws integration package must be installed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        }),
      };
    }

    const services: AwsOnboardingDiscoverOutput['services'] = [];
    for (const billingName of discovery.servicesInUse) {
      await yieldToEventLoop();
      if (context.abortSignal.aborted) {
        break;
      }
      const serviceId = BILLING_NAME_TO_SERVICE_ID[billingName];
      const entry = serviceId ? matrix.find(({ id }) => id === serviceId) : undefined;
      if (!entry) {
        services.push({
          id: toKebabCase(billingName),
          name: billingName,
          billing_name: billingName,
          matched: false,
          agentless: false,
        });
        continue;
      }
      services.push({
        id: entry.id,
        name: entry.name,
        billing_name: billingName,
        matched: true,
        agentless: isAgentless(entry),
        ...(entry.id === 'guardduty' && discovery.guarddutyDetectorIds.length > 0
          ? { detector_ids: discovery.guarddutyDetectorIds }
          : {}),
      });
    }

    return {
      output: {
        account_id: discovery.accountId,
        region: discovery.region,
        services,
        errors: discovery.errors,
      },
    };
  },
});
