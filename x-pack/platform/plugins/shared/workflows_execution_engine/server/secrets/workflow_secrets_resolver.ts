/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecretsPluginStart } from '@kbn/secrets-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import {
  WORKFLOWS_SECRETS_CONSUMER_ID,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import { WorkflowSecretsError } from './workflow_secrets_error';

/** Gives the steps of one workflow run the values of the secrets they reference. */
export interface WorkflowSecretsResolver {
  /**
   * Returns the value of every named secret. Throws `WorkflowSecretsError` when the workflow is
   * shared across spaces, when the account running it may not use secrets, or when any value
   * cannot be obtained.
   */
  resolve(params: { names: readonly string[] }): Promise<ReadonlyMap<string, string>>;
}

export interface CreateWorkflowSecretsResolverParams {
  /** The request the workflow runs as. Its account needs the privilege to use secrets. */
  request: KibanaRequest;
  spaceId: string;
  secrets: SecretsPluginStart;
  /** Undefined when security is off. The privilege check then passes, like on routes. */
  authz: SecurityPluginStart['authz'] | undefined;
  /**
   * Whether the workflow is stored in the global space. Secrets belong to one space, so such a
   * workflow cannot use them. It is only called once a step needs a secret.
   */
  isGlobalWorkflow: () => Promise<boolean>;
}

const quote = (names: readonly string[]): string => names.map((name) => `"${name}"`).join(', ');

/**
 * Creates the secrets resolver of one task run. Values are kept in memory until the task
 * run ends, and are never written anywhere.
 */
export const createWorkflowSecretsResolver = ({
  request,
  spaceId,
  secrets,
  authz,
  isGlobalWorkflow,
}: CreateWorkflowSecretsResolverParams): WorkflowSecretsResolver => {
  const values = new Map<string, string>();
  let canUseSecrets: Promise<boolean> | undefined;
  let isGlobal: Promise<boolean> | undefined;

  const checkCanUseSecrets = async (): Promise<boolean> => {
    if (!authz?.mode.useRbacForRequest(request)) {
      return true;
    }
    // Feature privileges are granted as `api:<name>`. `actions.api.get(name)` is deprecated,
    // and `get(operation, subject)` builds `api:<operation>_<subject>`, a different action.
    const required = WorkflowsManagementOperationPrivileges.useSecrets.map(
      (privilege) => `api:${privilege}`
    );
    const { hasAllRequested } = await authz
      .checkPrivilegesWithRequest(request)
      .atSpace(spaceId, { kibana: required });
    return hasAllRequested;
  };

  return {
    resolve: async ({ names }) => {
      // Saving refuses secrets in a global workflow. This stops one that got stored anyway.
      isGlobal ??= isGlobalWorkflow();
      if (await isGlobal) {
        throw new WorkflowSecretsError(
          `Cannot use ${quote(names)}: workflows shared across all spaces cannot use secrets, ` +
            `because each secret belongs to a single space.`
        );
      }

      canUseSecrets ??= checkCanUseSecrets();
      if (!(await canUseSecrets)) {
        throw new WorkflowSecretsError(
          `Cannot use ${quote(names)}: the account running this workflow needs the ` +
            `"Use secrets in workflow runs" privilege in this space.`
        );
      }

      const unresolved = names.filter((name) => !values.has(name));
      if (unresolved.length > 0) {
        const client = secrets.getClient({ request, consumer: WORKFLOWS_SECRETS_CONSUMER_ID });
        const resolved = await client.resolve({ names: unresolved });
        if (resolved.missing.length > 0) {
          throw new WorkflowSecretsError(
            `Secrets not found in this space: ${quote(resolved.missing)}. ` +
              `Create them, or check the spelling and the casing of the names.`
          );
        }
        if (resolved.failed.length > 0) {
          const reasons = resolved.failed.map(({ name, message }) => `"${name}" (${message})`);
          throw new WorkflowSecretsError(`Could not get the value of: ${reasons.join(', ')}.`);
        }
        resolved.values.forEach((value, name) => values.set(name, value));
      }

      return new Map(
        names.flatMap((name) => {
          const value = values.get(name);
          return value === undefined ? [] : [[name, value]];
        })
      );
    },
  };
};
