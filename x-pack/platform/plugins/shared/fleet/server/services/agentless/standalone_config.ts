/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';

import type { ElasticsearchClient } from '@kbn/core/server';

import type {
  FullAgentPolicy,
  NewPackagePolicy,
  PackageInfo,
  PackagePolicy,
} from '../../../common/types';
import { AgentlessAgentConfigError } from '../../errors';
import { getPolicySecretPaths } from '../secrets';

/**
 * Builds the config an agentless deployment needs to run standalone: no fleet-server, no
 * enrollment, no checkin. Credentials never appear in the config itself — they are replaced by
 * `${ENV_VAR}` placeholders and shipped alongside it, for agentless-api to inject into the pod.
 */

/** Matches what `toCompiledSecretRef` (services/secrets/common.ts) writes into compiled policies. */
const COMPILED_SECRET_REF_REGEX = /\$co\.elastic\.secret\{([^}]*)\}/g;

const SECRET_ENV_VAR_PREFIX = 'SECRET_';

/**
 * Env var carrying the Elasticsearch output API key. Matches the `${API_KEY}` placeholder that
 * `getFullAgentPolicy({ standalone: true })` already emits, so the config needs no rewriting for it.
 */
export const OUTPUT_API_KEY_ENV_VAR = 'API_KEY';

/**
 * Plaintext values shorter than this are not checked for in the config body. Substring matching on
 * a 2-character secret would false-positive on ordinary config text.
 */
const MIN_LENGTH_FOR_PLAINTEXT_SCAN = 8;

export interface StandaloneAgentlessConfig {
  /** Agent config. Credentials appear only as `${ENV_VAR}` placeholders. */
  config: FullAgentPolicy;
  /** Placeholder env var name -> plaintext value. Must be redacted wherever the payload is logged. */
  integrationSecrets: Record<string, string>;
}

/**
 * Secret ids come from Elasticsearch and may contain `-`, which is invalid in an env var name.
 * Kibana owns this mapping; agentless-api treats the resulting keys as opaque strings.
 */
export const toSecretEnvVarName = (secretId: string): string =>
  `${SECRET_ENV_VAR_PREFIX}${secretId.replace(/[^A-Za-z0-9_]/g, '_')}`;

/**
 * Pairs each secret id with the plaintext the user submitted, by walking the same secret paths on
 * the plaintext policy (from the request body) and the stored policy (which holds the refs).
 *
 * Kibana cannot read `.fleet-secrets` back, so this is the only point where the two are both in
 * hand. Paths whose stored value is a ref but whose submitted value is also a ref are skipped:
 * that is the "unchanged on edit" case, where agentless-api keeps the value it already has.
 */
export const collectSecretValuesById = ({
  plaintextPackagePolicy,
  storedPackagePolicy,
  packageInfo,
}: {
  plaintextPackagePolicy: NewPackagePolicy;
  storedPackagePolicy: PackagePolicy;
  packageInfo: PackageInfo;
}): Record<string, string> => {
  const plaintextByPath = keyBy(
    getPolicySecretPaths(plaintextPackagePolicy, packageInfo),
    ({ path }) => path.join('.')
  );

  const valuesById: Record<string, string> = {};

  for (const storedPath of getPolicySecretPaths(storedPackagePolicy, packageInfo)) {
    const storedValue = storedPath.value?.value;
    if (!storedValue?.isSecretRef) {
      continue;
    }

    const submittedValue = plaintextByPath[storedPath.path.join('.')]?.value?.value;
    if (submittedValue === undefined || submittedValue === null || submittedValue.isSecretRef) {
      continue;
    }

    // Multi-value secrets are stored as an id per value, in submission order.
    if (storedValue.ids) {
      storedValue.ids.forEach((id: string, index: number) => {
        const value = Array.isArray(submittedValue) ? submittedValue[index] : submittedValue;
        if (value !== undefined && value !== null) {
          valuesById[id] = String(value);
        }
      });
      continue;
    }

    valuesById[storedValue.id] = String(submittedValue);
  }

  return valuesById;
};

const rewriteSecretRefs = (value: unknown, onSecretId: (secretId: string) => string): unknown => {
  if (typeof value === 'string') {
    return value.replace(
      COMPILED_SECRET_REF_REGEX,
      (_match, secretId) => `\${${onSecretId(secretId)}}`
    );
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteSecretRefs(entry, onSecretId));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, rewriteSecretRefs(entry, onSecretId)])
    );
  }
  return value;
};

/**
 * Guards against shipping a config the agent cannot run, or one that leaks a credential. Each of
 * these would otherwise fail silently — the agent starts and quietly collects nothing, or a secret
 * ends up at rest in the config store.
 */
const assertConfigIsDeliverable = (
  config: FullAgentPolicy,
  integrationSecrets: Record<string, string>
): void => {
  const serialized = JSON.stringify(config);

  const unresolved = serialized.match(COMPILED_SECRET_REF_REGEX);
  if (unresolved) {
    throw new AgentlessAgentConfigError(
      `Standalone config still contains unresolved secret references: ${unresolved.join(', ')}`
    );
  }

  const placeholders = [...serialized.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(
    ([, name]) => name
  );
  const uncovered = placeholders.filter((name) => !(name in integrationSecrets));
  if (uncovered.length) {
    throw new AgentlessAgentConfigError(
      `Standalone config has placeholders with no value supplied: ${[...new Set(uncovered)].join(
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
      `Standalone config contains plaintext credentials for: ${leaked.join(', ')}`
    );
  }
};

export const buildStandaloneAgentlessConfig = async ({
  esClient,
  policyId,
  standaloneAgentPolicy,
  secretValuesById,
  outputApiKeyServiceToken,
}: {
  esClient: ElasticsearchClient;
  policyId: string;
  /** Result of `getFullAgentPolicy(soClient, policyId, { standalone: true })`. */
  standaloneAgentPolicy: FullAgentPolicy;
  /** From `collectSecretValuesById`. */
  secretValuesById: Record<string, string>;
  /**
   * Service token to authenticate the output API key creation as (an `elastic/fleet-server`
   * token). An API key is capped at the intersection of its role descriptors and the creating
   * principal's privileges; Kibana's own service account can neither write agent data streams
   * nor read/write the `agentless-*` state indices, so a key it creates is unusable by the agent
   * no matter what the descriptors grant. fleet-server's service account carries exactly the
   * needed privileges — this is who mints these keys in v1.
   */
  outputApiKeyServiceToken?: string;
}): Promise<StandaloneAgentlessConfig> => {
  const envVarNameBySecretId = new Map<string, string>();
  const secretIdByEnvVarName = new Map<string, string>();

  const resolveEnvVarName = (secretId: string): string => {
    const cached = envVarNameBySecretId.get(secretId);
    if (cached) {
      return cached;
    }

    const envVarName = toSecretEnvVarName(secretId);
    const collidingId = secretIdByEnvVarName.get(envVarName);
    // Two ids differing only in `-` vs `_` map to the same env var. Vanishingly unlikely, and
    // silent if unchecked: one value would overwrite the other.
    if (collidingId) {
      throw new AgentlessAgentConfigError(
        `Secret ids [${collidingId}] and [${secretId}] both map to env var [${envVarName}]`
      );
    }

    envVarNameBySecretId.set(secretId, envVarName);
    secretIdByEnvVarName.set(envVarName, secretId);
    return envVarName;
  };

  const config = rewriteSecretRefs(standaloneAgentPolicy, resolveEnvVarName) as FullAgentPolicy;

  // `secret_references` is how fleet-server learns what to resolve; a standalone agent has no use
  // for it, and the env var names now carry that information.
  delete config.secret_references;

  // POC: the internal dev cluster uses a self-signed cert; disable TLS verification so the agent
  // can reach Elasticsearch without a trusted CA bundle.
  for (const output of Object.values(config.outputs)) {
    if (output.type === 'elasticsearch') {
      output.ssl = { ...(output.ssl ?? {}), verification_mode: 'none' };
    }
  }

  const integrationSecrets: Record<string, string> = {};

  for (const [secretId, envVarName] of envVarNameBySecretId) {
    const value = secretValuesById[secretId];
    // Only reachable when a referenced secret was not submitted in this request — today that means
    // an edit (out of scope) or a pre-existing cloud connector ref. Fail rather than ship a config
    // with an unresolvable placeholder.
    if (value === undefined) {
      throw new AgentlessAgentConfigError(
        `No value available for secret [${secretId}] referenced by agentless policy [${policyId}]`
      );
    }
    integrationSecrets[envVarName] = value;
  }

  // output_permissions is fleet-server metadata — the agent doesn't need it; agentless-api
  // doesn't use it. Remove it from the config now that we've minted the key from it.
  delete config.output_permissions;

  integrationSecrets[OUTPUT_API_KEY_ENV_VAR] = await mintOutputApiKey({
    esClient,
    policyId,
    standaloneAgentPolicy,
    outputApiKeyServiceToken,
  });

  assertConfigIsDeliverable(config, integrationSecrets);

  return { config, integrationSecrets };
};

/**
 * Creates the ES output API key scoped to exactly the index privileges this policy needs, and
 * returns it in `id:key` form. output_permissions[outputId] is computed by
 * storedPackagePoliciesToAgentPermissions() in full_agent_policy.ts and has the same shape as
 * createApiKey's role_descriptors — a Record<roleName, SecurityRoleDescriptor> covering every
 * data stream written by the integration.
 */
export const mintOutputApiKey = async ({
  esClient,
  policyId,
  standaloneAgentPolicy,
  outputApiKeyServiceToken,
}: {
  esClient: ElasticsearchClient;
  policyId: string;
  standaloneAgentPolicy: FullAgentPolicy;
  outputApiKeyServiceToken?: string;
}): Promise<string> => {
  const outputId = Object.keys(standaloneAgentPolicy.outputs)[0];
  const roleDescriptors = standaloneAgentPolicy.output_permissions?.[outputId];
  if (!roleDescriptors || Object.keys(roleDescriptors).length === 0) {
    throw new AgentlessAgentConfigError(
      `No output_permissions found for output [${outputId}] in agentless policy [${policyId}] — cannot create a scoped ES API key`
    );
  }

  const outputApiKey = await esClient.security.createApiKey(
    {
      name: `agentless-${policyId}`,
      metadata: { managed: true },
      role_descriptors: roleDescriptors,
    },
    // Per-request auth override: the key's owner becomes the service token's principal instead
    // of Kibana. See the `outputApiKeyServiceToken` doc comment for why this is required.
    outputApiKeyServiceToken
      ? { headers: { authorization: `Bearer ${outputApiKeyServiceToken}` } }
      : {}
  );
  return `${outputApiKey.id}:${outputApiKey.api_key}`;
};
