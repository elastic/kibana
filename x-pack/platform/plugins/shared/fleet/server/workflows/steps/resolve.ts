/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import {
  buildIacIntegrations,
  buildPackageInputs,
  buildPackageVars,
  disableUnlistedPackageInputs,
  getPackageVarNames,
  buildSettingsRequirement,
  diffIacIntegrations,
  getServiceIndexPatterns,
  mergeIacIntegrations,
} from '../../../common/services/aws_onboarding_catalog';
import type {
  AwsServiceMatrixEntry,
  PackageInputEntry,
} from '../../../common/services/aws_onboarding_catalog';
import type { RenderIacTemplateIntegration } from '../../../common/types';
import type { AwsOnboardingIdentity } from '../../../common/workflows/steps/list_identities';
import { awsOnboardingResolveCommonDefinition } from '../../../common/workflows/steps/resolve';
import type {
  AwsOnboardingResolveInput,
  AwsOnboardingResolveOutput,
} from '../../../common/workflows/steps/resolve';
import {
  pickSelectedServices,
  settingsAnswerToServiceVars,
  validateSettingsAnswer,
} from '../../../common/workflows/steps/settings';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { loadAwsServiceMatrix, isAgentless } from './aws_service_matrix';

const DEFAULT_NAMESPACE = 'default';

/**
 * Fleet leaves a stream the body does not list at its package default, so on every input the body
 * enables, each of the service's streams the answer did not switch on is listed as disabled (S3's
 * storage and request metrics share one input and are both on by default).
 */
const disableUnansweredStreams = (
  service: AwsServiceMatrixEntry,
  inputs: Record<string, PackageInputEntry>
): Record<string, PackageInputEntry> => {
  const ptName = service.policyTemplate ?? service.id;
  const result = { ...inputs };
  service.dataStreams.forEach((dsId) => {
    const streamKey = `${service.packageName}.${dsId}`;
    (service.varDefsByDataStream?.[dsId]?.inputs ?? []).forEach((inputType) => {
      const entry = result[`${ptName}-${inputType}`];
      if (!entry || entry.streams[streamKey]) return;
      result[`${ptName}-${inputType}`] = {
        ...entry,
        streams: { ...entry.streams, [streamKey]: { enabled: false, vars: {} } },
      };
    });
  });
  return result;
};

type PlannedIdentity = Pick<
  AwsOnboardingResolveOutput,
  'identity_name' | 'stack_action' | 'stack_id' | 'template_sha' | 'cloud_connector_id'
> & { covered: RenderIacTemplateIntegration[] };

/**
 * A new identity gets a stack; a reused one keeps its connector and has its stack updated when
 * the run can update it, else is reused as it is. The answer is untrusted input, so a reused
 * identity must be one the run listed.
 */
const planIdentity = (
  identity: AwsOnboardingResolveInput['identity'],
  identities: AwsOnboardingIdentity[]
): PlannedIdentity | ExecutionError => {
  if ('name' in identity) {
    return { identity_name: identity.name, stack_action: 'create', covered: [] };
  }
  const reused = identities.find(({ id }) => id === identity.reuse_cloud_connector_id);
  if (!reused) {
    return new ExecutionError({
      type: 'ValidationError',
      message: `Federated Identity "${identity.reuse_cloud_connector_id}" is not one of the account's identities`,
    });
  }
  return {
    identity_name: reused.name,
    stack_action: reused.updatable ? 'update' : 'none',
    ...(reused.updatable && { stack_id: reused.stack_id, template_sha: reused.template_sha }),
    cloud_connector_id: reused.id,
    covered: reused.covered_integrations,
  };
};

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
      region,
      namespace = DEFAULT_NAMESPACE,
      account_id,
      run_suffix: runSuffix,
      settings,
      policy_names: policyNames,
      identity,
      identities = [],
    } = context.input;
    const requested = pickSelectedServices(context.input);
    if (!requested) {
      return {
        error: new ExecutionError({
          type: 'ValidationError',
          message: 'No AWS services were selected or passed to the run',
        }),
      };
    }
    const planned = planIdentity(identity, identities);
    if (planned instanceof ExecutionError) {
      return { error: planned };
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

    // The answer is untrusted input, so it is checked against the requirement the matrix yields.
    const requirement = buildSettingsRequirement({ services: selected, packageInfo, region });
    const problems = validateSettingsAnswer(requirement, settings);
    if (problems.length > 0) {
      return {
        error: new ExecutionError({
          type: 'ValidationError',
          message: `Invalid onboarding settings: ${problems
            .map(({ path, message }) => `${path}: ${message}`)
            .join('; ')}`,
          details: { problems },
        }),
      };
    }
    const serviceVars = settingsAnswerToServiceVars(requirement, settings);
    // A service missing from the answer is deselected.
    const answered = selected.filter(({ id }) => id in serviceVars);

    const integrations = buildIacIntegrations(
      answered.map((service) => ({
        instance: {
          instanceId: service.id,
          serviceId: service.id,
          name: service.name,
          isDuplicate: false,
        },
        service,
      })),
      serviceVars
    );

    // Fleet enforces unique policy and connector names, so a re-run needs its own suffix.
    const suffix = runSuffix?.trim() || Date.now().toString(36);
    const packageVars = buildPackageVars(region, undefined, getPackageVarNames(packageInfo));

    const policies = answered.map((service) => {
      const name = policyNames?.[service.id] ?? `aws-${service.id}-agentless-${suffix}`;
      return {
        service: service.id,
        name,
        body: {
          name,
          namespace,
          package: { name: 'aws' as const, version: packageVersion },
          // The agentless API skips the pass that disables default-enabled inputs, and it needs
          // the template to validate against, so both are explicit.
          policy_template: service.policyTemplate ?? service.id,
          ...(packageVars ? { vars: packageVars } : {}),
          inputs: disableUnlistedPackageInputs(
            disableUnansweredStreams(service, buildPackageInputs([service], serviceVars, region)),
            packageInfo.policy_templates
          ),
        },
      };
    });

    const permissionsSummary = integrations.flatMap(({ policyTemplates }) =>
      policyTemplates.map(({ name, enabledInputs }) => `${name} (${enabledInputs.join(', ')})`)
    );

    const { covered, ...identityOutput } = planned;

    const indexPatterns = [
      ...new Set(answered.flatMap((service) => getServiceIndexPatterns(service, namespace))),
    ];

    return {
      output: {
        package_name: 'aws' as const,
        package_version: packageVersion,
        integrations,
        policies,
        index_patterns: indexPatterns,
        permissions_summary: permissionsSummary,
        // Liquid renders a missing account id as an empty string.
        suggested_identity_name: `aws-${account_id || 'account'}-federated-identity-${suffix}`,
        ...identityOutput,
        added_policy_templates: diffIacIntegrations(covered, integrations),
        stack_integrations: mergeIacIntegrations(covered, integrations),
      },
    };
  },
});
