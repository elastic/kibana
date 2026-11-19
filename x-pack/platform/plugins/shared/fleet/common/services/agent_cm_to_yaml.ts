/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentConfigMap } from '../types/models/agent_cm';

import type { YamlModule } from './yaml_utils';
import { createYamlKeysSorter, toYaml } from './yaml_utils';

const CM_KEYS_ORDER = ['apiVersion', 'kind', 'metadata', 'data'];

export const fullAgentConfigMapToYaml = (policy: FullAgentConfigMap, yaml: YamlModule): string => {
  const sortCmKeys = createYamlKeysSorter(CM_KEYS_ORDER, yaml);
  return toYaml(policy, { sortMapEntries: sortCmKeys, strict: false, schema: 'yaml-1.1' }, yaml);
};
