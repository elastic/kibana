/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonOtelIndexPatterns } from './otel_index_patterns';
import { BuiltInDefinition } from '../../../../types';

export const builtInKubernetesNodeSemConvEntityDefinition: BuiltInDefinition = {
  type: {
    id: `${BUILT_IN_ID_PREFIX}kubernetes_node_semconv`,
    display_name: 'Kubernetes Nodes (OTEL)',
  },
  sources: [
    {
      id: `${BUILT_IN_ID_PREFIX}kubernetes_node_semconv_semconv`,
      type_id: `${BUILT_IN_ID_PREFIX}kubernetes_node_semconv`,
      index_patterns: commonOtelIndexPatterns,
      identity_fields: ['k8s.node.uid'],
      display_name: 'k8s.node.name',
      timestamp_field: '@timestamp',
      metadata_fields: [],
      filters: ['k8s.node.uid: *'],
    },
  ],
};
