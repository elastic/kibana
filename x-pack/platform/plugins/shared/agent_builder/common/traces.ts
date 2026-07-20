/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildAgentBuilderTracesIndexPattern = (spaceId: string) => {
  return `traces-agent_builder.otel-${spaceId}`;
};

export const buildAgentBuilderTraceLogsIndexPattern = (spaceId: string) => {
  return `logs-agent_builder.otel-${spaceId}`;
};
