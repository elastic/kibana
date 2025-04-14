/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Profiling fields

/**
 * @see https://www.elastic.co/guide/en/observability/current/profiling-config-file.html
 */
export const ATTR_PROFILING_AGENT_CONFIG_PROBABILISTIC_THRESHOLD =
  'profiling.agent.config.probabilistic_threshold' as const;

export const ATTR_PROFILING_AGENT_START_TIME = 'profiling.agent.start_time' as const;

/**
 * @see https://github.com/rockdaboot/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-hosts.json
 */
export const ATTR_PROFILING_HOST_NAME = 'profiling.host.name' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_PROFILING_PROJECT_ID = 'profiling.project.id' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_STACKTRACE_COUNT = 'Stacktrace.count' as const;

/**
 * @see https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json
 */
export const ATTR_STACKTRACE_ID = 'Stacktrace.id' as const;
