/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import {
  buildIacIntegrations,
  buildPackageInputs,
  getServiceIndexPatterns,
} from '../../../common/services/aws_onboarding_catalog';
import type { AwsServiceMatrixEntry } from '../../../common/services/aws_onboarding_catalog';
import { awsOnboardingResolveCommonDefinition } from '../../../common/workflows/steps/resolve';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { loadAwsServiceMatrix, isAgentless } from './aws_service_matrix';

const DEFAULT_NAMESPACE = 'default';

export const awsOnboardingResolveStepDefinition = createServerStepDefinition({
  ...awsOnboardingResolveCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const {
      services: requested,
      region,
      namespace = DEFAULT_NAMESPACE,
      account_id,
    } = context.input;
    const { packageVersion, matrix } = await loadAwsServiceMatrix(context);

    const selected: AwsServiceMatrixEntry[] = [];
    const rejected: string[] = [];
    for (const serviceId of requested) {
      const entry = matrix.find(({ id }) => id === serviceId);
      if (entry && isAgentless(entry)) {
        selected.push(entry);
      } else {
        rejected.push(serviceId);
      }
    }
    if (rejected.length > 0) {
      return {
        error: new ExecutionError({
          type: 'ValidationError',
          message: `Not agentless-capable or unknown AWS services: ${rejected.join(', ')}`,
          details: { services: rejected },
        }),
      };
    }

    const integrations = buildIacIntegrations(
      selected.map((service) => ({
        instance: {
          instanceId: service.id,
          serviceId: service.id,
          name: service.name,
          isDuplicate: false,
        },
        service,
      })),
      {}
    );

    const policies = selected.map((service) => {
      const name = `aws-${service.id}-agentless`;
      return {
        service: service.id,
        name,
        body: {
          name,
          namespace,
          package: { name: 'aws' as const, version: packageVersion },
          inputs: buildPackageInputs([service], {}, region),
        },
      };
    });

    const indexPatterns = [
      ...new Set(selected.flatMap((service) => getServiceIndexPatterns(service, namespace))),
    ];

    return {
      output: {
        package_name: 'aws' as const,
        package_version: packageVersion,
        integrations,
        policies,
        index_patterns: indexPatterns,
        suggested_identity_name: `aws-${account_id ?? 'account'}-federated-identity`,
      },
    };
  },
});
