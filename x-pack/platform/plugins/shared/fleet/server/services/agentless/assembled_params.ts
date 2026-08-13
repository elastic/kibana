/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  FullAgentPolicy,
  PackagePolicy,
  PackagePolicyConfigRecord,
} from '../../../common/types';
import { AgentlessAgentConfigError } from '../../errors';

import { mintOutputApiKey, toSecretEnvVarName, OUTPUT_API_KEY_ENV_VAR } from './standalone_config';

/**
 * Scenario-2 POC ("assembler"): instead of shipping the assembled agent configuration, Kibana
 * ships only the user's integration parameters — package coordinates, enabled inputs/streams and
 * their vars — plus credentials. agentless-api fetches the package from EPR and assembles the
 * configuration itself. This module builds that parameter payload from the stored package policy.
 *
 * Secrets keep the exact contract of the standalone POC: secret-ref vars are rewritten to
 * `${SECRET_<id>}` placeholder strings inside the vars, and the plaintext values travel
 * side-band in `integration_secrets`.
 */

interface IntegrationVarsParam {
  [name: string]: { type?: string; value: unknown };
}

interface IntegrationStreamParam {
  id?: string;
  enabled: boolean;
  data_stream: { dataset: string; type?: string };
  vars?: IntegrationVarsParam;
}

interface IntegrationInputParam {
  type: string;
  policy_template?: string;
  enabled: boolean;
  vars?: IntegrationVarsParam;
  streams?: IntegrationStreamParam[];
}

export interface IntegrationParams {
  package: { name: string; version: string };
  package_policy_id: string;
  name?: string;
  namespace?: string;
  revision?: number;
  inputs: IntegrationInputParam[];
  output: { hosts: string[]; ssl_verification_mode?: string };
  global_data_tags?: Array<{ name: string; value: string }>;
}

export interface AssembledParamsAgentlessConfig {
  /** The user's integration parameters. Credentials appear only as `${ENV_VAR}` placeholders. */
  integrationParams: IntegrationParams;
  /** Placeholder env var name -> plaintext value. Must be redacted wherever the payload is logged. */
  integrationSecrets: Record<string, string>;
}

/**
 * Plaintext values shorter than this are not checked for in the params body — substring matching
 * on very short secrets would false-positive on ordinary config text.
 */
const MIN_LENGTH_FOR_PLAINTEXT_SCAN = 8;

const rewriteVarsSecretRefs = (
  vars: PackagePolicyConfigRecord | undefined,
  onSecretId: (secretId: string) => string
): IntegrationVarsParam | undefined => {
  if (!vars || Object.keys(vars).length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(vars).map(([name, record]) => {
      let value = record.value;
      if (value?.isSecretRef) {
        value = value.ids
          ? value.ids.map((id: string) => `\${${onSecretId(id)}}`)
          : `\${${onSecretId(value.id)}}`;
      }
      return [name, { type: record.type, value }];
    })
  );
};

/**
 * The tags Kibana's own assembly would attach to every input as an add_fields processor. Read
 * back from the internally computed full policy rather than re-implementing the (non-trivial)
 * global data tag filtering: the tag *values* are Kibana bookkeeping either way — only config
 * assembly moves to agentless-api in this scenario.
 */
const collectGlobalDataTags = (
  standaloneAgentPolicy: FullAgentPolicy
): Array<{ name: string; value: string }> | undefined => {
  const fields = standaloneAgentPolicy.inputs?.[0]?.processors?.[0]?.add_fields?.fields;
  if (!fields || Object.keys(fields).length === 0) {
    return undefined;
  }
  return Object.entries(fields).map(([name, value]) => ({ name, value: String(value) }));
};

/**
 * Guards against shipping parameters agentless-api cannot assemble into a runnable config, or
 * that leak a credential: every placeholder must have a value, and no plaintext credential may
 * appear in the params body (it would end up at rest in the assembled config).
 */
const assertParamsAreDeliverable = (
  integrationParams: IntegrationParams,
  integrationSecrets: Record<string, string>
): void => {
  const serialized = JSON.stringify(integrationParams);

  const unresolved = serialized.match(/\$co\.elastic\.secret\{([^}]*)\}/g);
  if (unresolved) {
    throw new AgentlessAgentConfigError(
      `Integration params still contain unresolved secret references: ${unresolved.join(', ')}`
    );
  }

  const placeholders = [...serialized.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(
    ([, name]) => name
  );
  const uncovered = placeholders.filter((name) => !(name in integrationSecrets));
  if (uncovered.length) {
    throw new AgentlessAgentConfigError(
      `Integration params have placeholders with no value supplied: ${[...new Set(uncovered)].join(
        ', '
      )}`
    );
  }

  const leaked = Object.entries(integrationSecrets)
    .filter(
      ([, value]) => value.length >= MIN_LENGTH_FOR_PLAINTEXT_SCAN && serialized.includes(value)
    )
    .map(([name]) => name);
  if (leaked.length) {
    throw new AgentlessAgentConfigError(
      `Integration params contain plaintext credentials for: ${leaked.join(', ')}`
    );
  }
};

export const buildAssembledParamsConfig = async ({
  esClient,
  policyId,
  packagePolicy,
  standaloneAgentPolicy,
  secretValuesById,
  outputApiKeyServiceToken,
}: {
  esClient: ElasticsearchClient;
  policyId: string;
  /** The stored package policy (with secret refs), holding the user's raw input. */
  packagePolicy: PackagePolicy;
  /**
   * Result of `getFullAgentPolicy(soClient, policyId, { standalone: true })`. Computed internally
   * and never shipped: it provides `output_permissions` for API key scoping, the ES output hosts
   * and the global data tags. Only the parameters below cross the wire.
   */
  standaloneAgentPolicy: FullAgentPolicy;
  /** From `collectSecretValuesById`. */
  secretValuesById: Record<string, string>;
  /** See `buildStandaloneAgentlessConfig` — same minting-principal constraint. */
  outputApiKeyServiceToken?: string;
}): Promise<AssembledParamsAgentlessConfig> => {
  if (!packagePolicy.package) {
    throw new AgentlessAgentConfigError(
      `Package policy [${packagePolicy.id}] has no package — cannot build integration params`
    );
  }

  const integrationSecrets: Record<string, string> = {};
  const resolveEnvVarName = (secretId: string): string => {
    const envVarName = toSecretEnvVarName(secretId);
    const value = secretValuesById[secretId];
    if (value === undefined) {
      throw new AgentlessAgentConfigError(
        `No value available for secret [${secretId}] referenced by agentless policy [${policyId}]`
      );
    }
    if (envVarName in integrationSecrets && integrationSecrets[envVarName] !== value) {
      throw new AgentlessAgentConfigError(`Two secret ids map to the same env var [${envVarName}]`);
    }
    integrationSecrets[envVarName] = value;
    return envVarName;
  };

  const inputs: IntegrationInputParam[] = packagePolicy.inputs
    .filter((input) => input.enabled)
    .map((input) => ({
      type: input.type,
      ...(input.policy_template ? { policy_template: input.policy_template } : {}),
      enabled: input.enabled,
      vars: rewriteVarsSecretRefs(input.vars, resolveEnvVarName),
      streams: input.streams
        .filter((stream) => stream.enabled)
        .map((stream) => ({
          id: stream.id,
          enabled: stream.enabled,
          data_stream: stream.data_stream,
          vars: rewriteVarsSecretRefs(stream.vars, resolveEnvVarName),
        })),
    }));

  const outputId = Object.keys(standaloneAgentPolicy.outputs)[0];
  const output = standaloneAgentPolicy.outputs[outputId];
  const hosts = output?.hosts ?? [];
  if (hosts.length === 0) {
    throw new AgentlessAgentConfigError(
      `Output [${outputId}] of agentless policy [${policyId}] has no hosts — cannot build integration params`
    );
  }

  const integrationParams: IntegrationParams = {
    package: {
      name: packagePolicy.package.name,
      version: packagePolicy.package.version,
    },
    package_policy_id: packagePolicy.id,
    name: packagePolicy.name,
    namespace: packagePolicy.namespace || 'default',
    revision: packagePolicy.revision,
    inputs,
    output: {
      hosts,
      // POC: the internal dev cluster uses a self-signed cert, same as the standalone mode.
      ssl_verification_mode: 'none',
    },
    global_data_tags: collectGlobalDataTags(standaloneAgentPolicy),
  };

  integrationSecrets[OUTPUT_API_KEY_ENV_VAR] = await mintOutputApiKey({
    esClient,
    policyId,
    standaloneAgentPolicy,
    outputApiKeyServiceToken,
  });

  assertParamsAreDeliverable(integrationParams, integrationSecrets);

  return { integrationParams, integrationSecrets };
};
