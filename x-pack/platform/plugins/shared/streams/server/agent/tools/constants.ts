/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toolNamespaces } from '@kbn/agent-builder-common';

const ns = toolNamespaces.streams;

export const STREAMS_TOOL_IDS = {
  gather_context: `${ns}.gather_context`,
  find_changed_queries: `${ns}.find_changed_queries`,
  cluster_by_time: `${ns}.cluster_by_time`,
  group_within_window: `${ns}.group_within_window`,
  sample_cluster: `${ns}.sample_cluster`,
  describe_cluster: `${ns}.describe_cluster`,
  get_entity_timeline: `${ns}.get_entity_timeline`,
  explore_topology: `${ns}.explore_topology`,
  compare_to_baseline: `${ns}.compare_to_baseline`,
  context_expansion: `${ns}.context_expansion`,
  embedding_search_similar: `${ns}.embedding_search_similar`,
} as const;

export type StreamsToolId = (typeof STREAMS_TOOL_IDS)[keyof typeof STREAMS_TOOL_IDS];
