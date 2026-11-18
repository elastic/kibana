/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import { mergeIacIntegrations } from '../../../common/services/aws_onboarding_catalog';
import type {
  CloudConnector,
  PackagePolicy,
  RenderIacTemplateIntegration,
} from '../../../common/types';
import {
  awsOnboardingListIdentitiesCommonDefinition,
  type AwsOnboardingIdentity,
} from '../../../common/workflows/steps/list_identities';
import { appContextService } from '../../services/app_context';
import {
  awsOnboardingCredentialsService,
  DEFAULT_STACK_NAME_PREFIX,
} from '../../services/aws_onboarding';
import { cloudConnectorService } from '../../services/cloud_connector';
import { packagePolicyService } from '../../services/package_policy';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

const MAX_CONNECTORS = 100;
const MAX_POLICIES_PER_CONNECTOR = 1000;

/** Colon-separated ARN field: 3 is the region, 4 the account, 5 the resource. */
const arnField = (arn: string, index: number): string | undefined => arn.split(':')[index];

const readRoleArn = ({ vars }: CloudConnector): string | undefined => {
  const value = 'role_arn' in vars ? vars.role_arn.value : undefined;
  return typeof value === 'string' ? value : undefined;
};

/** One render entry for a policy: its package, with the enabled inputs per policy template. */
const toIacIntegration = (policy: PackagePolicy): RenderIacTemplateIntegration | undefined => {
  const packageName = policy.package?.name;
  if (!packageName) return undefined;
  // An input without its own policy template falls back to the policy's, when the policy has one.
  const policyTemplate =
    'policy_template' in policy && typeof policy.policy_template === 'string'
      ? policy.policy_template
      : undefined;
  const inputsByTemplate = new Map<string, string[]>();
  for (const { type, enabled, policy_template: inputTemplate } of policy.inputs) {
    const templateName = inputTemplate ?? policyTemplate;
    if (!enabled || !templateName) continue;
    inputsByTemplate.set(templateName, [...(inputsByTemplate.get(templateName) ?? []), type]);
  }
  if (inputsByTemplate.size === 0) return undefined;
  return {
    name: packageName,
    policyTemplates: [...inputsByTemplate.entries()].map(([name, enabledInputs]) => ({
      name,
      enabledInputs,
    })),
  };
};

/**
 * The run can update a stack only when it exists, lives in the credentials' region (the
 * CloudFormation client is built for that region) and carries the managed name prefix, the only
 * names the provisioning role may update.
 */
const updatability = (
  stackId: string | undefined,
  credentialsRegion: string | undefined,
  stackNamePrefix: string
): Pick<AwsOnboardingIdentity, 'updatable' | 'not_updatable_reason'> => {
  if (!stackId) {
    return { updatable: false, not_updatable_reason: 'no_stack' };
  }
  if (arnField(stackId, 3) !== credentialsRegion) {
    return { updatable: false, not_updatable_reason: 'other_region' };
  }
  const stackName = arnField(stackId, 5)?.split('/')[1] ?? '';
  if (!stackName.startsWith(`${stackNamePrefix}-`)) {
    return { updatable: false, not_updatable_reason: 'not_managed_prefix' };
  }
  return { updatable: true };
};

export const awsOnboardingListIdentitiesStepDefinition = createServerStepDefinition({
  ...awsOnboardingListIdentitiesCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    // Liquid renders a missing account id as an empty string, which lists every account.
    const { account_id: accountId } = context.input;
    try {
      const soClient = appContextService.getInternalUserSOClient(
        context.contextManager.getFakeRequest()
      );
      const [connectors, credentials] = await Promise.all([
        cloudConnectorService.getList(soClient, {
          kuery: `${CLOUD_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.cloudProvider: aws`,
          perPage: MAX_CONNECTORS,
        }),
        awsOnboardingCredentialsService.getPublic(),
      ]);
      const stackNamePrefix = credentials.stackNamePrefix ?? DEFAULT_STACK_NAME_PREFIX;

      const identities: AwsOnboardingIdentity[] = [];
      for (const connector of connectors) {
        await yieldToEventLoop();
        if (context.abortSignal.aborted) {
          break;
        }
        const roleArn = readRoleArn(connector);
        if (!roleArn || (accountId && arnField(roleArn, 4) !== accountId)) {
          continue;
        }

        const { items } = await packagePolicyService.list(soClient, {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${connector.id}"`,
          perPage: MAX_POLICIES_PER_CONNECTOR,
        });
        let covered: RenderIacTemplateIntegration[] = [];
        for (const policy of items) {
          await yieldToEventLoop();
          if (context.abortSignal.aborted) {
            break;
          }
          const integration = toIacIntegration(policy);
          if (integration) {
            covered = mergeIacIntegrations(covered, [integration]);
          }
        }

        const stackId = connector.iac_deployment_id || undefined;
        identities.push({
          id: connector.id,
          name: connector.name,
          ...(stackId && { stack_id: stackId, stack_region: arnField(stackId, 3) }),
          created_at: connector.created_at,
          ...updatability(stackId, credentials.region, stackNamePrefix),
          covered_integrations: covered,
          covered_policy_templates: covered.flatMap(({ policyTemplates }) =>
            policyTemplates.map(({ name }) => name)
          ),
        });
      }
      return { output: { identities } };
    } catch (error) {
      return { error };
    }
  },
});
