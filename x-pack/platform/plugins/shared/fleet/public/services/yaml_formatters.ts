/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fullAgentPolicyToYaml as _fullAgentPolicyToYaml } from '../../common/services';
import type { FullAgentPolicy } from '../../common/types';

export async function getYamlFormatters() {
  const { dump } = await import('js-yaml');
  return {
    fullAgentPolicyToYaml: (policy: FullAgentPolicy, apiKey?: string) =>
      _fullAgentPolicyToYaml(policy, dump, apiKey),
  };
}
