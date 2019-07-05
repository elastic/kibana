/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';

const FIELDS = {
  [InfraNodeType.host]: 'system.memory.actual.used.pct',
  [InfraNodeType.pod]: 'kubernetes.pod.memory.usage.node.pct',
  [InfraNodeType.container]: 'docker.memory.usage.pct',
};

export const memory = (nodeType: InfraNodeType) => {
  return { memory: { avg: { field: FIELDS[nodeType] } } };
};
