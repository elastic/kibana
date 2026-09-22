/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadYaml } from '@kbn/yaml-loader';

import type { FullAgentPolicy } from '../../common';
import type { FullAgentConfigMap } from '../../common/types/models/agent_cm';

import { fullAgentPolicyToYaml } from '../../common/services/full_agent_policy_to_yaml';
import { fullAgentConfigMapToYaml } from '../../common/services/agent_cm_to_yaml';

export interface YamlFormatters {
  fullAgentPolicyToYaml: (policy: FullAgentPolicy, apiKey?: string) => string;
  fullAgentConfigMapToYaml: (policy: FullAgentConfigMap) => string;
}

let formattersPromise: Promise<YamlFormatters> | null = null;

/**
 * Returns YAML formatters that use the asynchronously loaded yaml package.
 * Result is cached so multiple callers share the same load.
 */
export const getYamlFormatters = (): Promise<YamlFormatters> => {
  if (!formattersPromise) {
    formattersPromise = loadYaml().then((yaml: Awaited<ReturnType<typeof loadYaml>>) => ({
      fullAgentPolicyToYaml: (policy: FullAgentPolicy, apiKey?: string) =>
        fullAgentPolicyToYaml(policy, yaml, apiKey),
      fullAgentConfigMapToYaml: (policy: FullAgentConfigMap) =>
        fullAgentConfigMapToYaml(policy, yaml),
    }));
  }
  return formattersPromise!;
};
