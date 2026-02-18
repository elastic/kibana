/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentConfigMap } from '../types/models/agent_cm';

import { createYamlKeysSorter } from './yaml_utils';

const CM_KEYS_ORDER = ['apiVersion', 'kind', 'metadata', 'data'];

const _sortCmKeys = createYamlKeysSorter(CM_KEYS_ORDER);

export const fullAgentConfigMapToYaml = (
  policy: FullAgentConfigMap,
  toYaml: (data: any, options: any) => string
): string => {
  return toYaml(policy, {
    sortMapEntries: _sortCmKeys,
    strict: false,
  });
};
