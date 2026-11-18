/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import {
  buildSettingsRequirement,
  extractReadmeNotes,
  getPolicyTemplateReadmePath,
} from '../../../common/services/aws_onboarding_catalog';
import type { AwsServiceMatrixEntry } from '../../../common/services/aws_onboarding_catalog';
import { pickSelectedServices } from '../../../common/workflows/steps/settings';
import { awsOnboardingSettingsRequirementCommonDefinition } from '../../../common/workflows/steps/settings_requirement';
import { getFile } from '../../services/epm/packages/get';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { loadAwsServiceMatrix, isAgentless } from './aws_service_matrix';

export const awsOnboardingSettingsRequirementStepDefinition = createServerStepDefinition({
  ...awsOnboardingSettingsRequirementCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const { region, account_id: accountId, run_suffix: runSuffix } = context.input;
    const requested = pickSelectedServices(context.input);
    if (!requested) {
      return {
        error: new ExecutionError({
          type: 'ValidationError',
          message: 'No AWS services were selected or passed to the run',
        }),
      };
    }
    const { packageVersion, packageInfo, matrix } = await loadAwsServiceMatrix(context);

    const selected: AwsServiceMatrixEntry[] = [];
    const rejected: string[] = [];
    for (const serviceId of requested) {
      await yieldToEventLoop();
      if (context.abortSignal.aborted) {
        break;
      }
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

    // Notes are a nicety: a missing README or a registry failure must never fail the step.
    const fetched = await Promise.allSettled(
      selected.map(async (service) => {
        const relPath = getPolicyTemplateReadmePath(
          packageInfo,
          service.policyTemplate ?? service.id
        );
        if (!relPath) return undefined;
        const response = await getFile('aws', packageVersion, relPath);
        return response ? extractReadmeNotes(await response.text()) : undefined;
      })
    );
    const readmeNotesByService: Record<string, string> = {};
    fetched.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled' && outcome.value) {
        readmeNotesByService[selected[index].id] = outcome.value;
      }
    });

    // The resolve step builds the same name from the same inputs.
    const suffix = runSuffix?.trim() || Date.now().toString(36);
    return {
      output: {
        ...buildSettingsRequirement({
          services: selected,
          packageInfo,
          region,
          readmeNotesByService,
        }),
        // Liquid renders a missing account id as an empty string.
        suggested_identity_name: `aws-${accountId || 'account'}-federated-identity-${suffix}`,
      },
    };
  },
});
