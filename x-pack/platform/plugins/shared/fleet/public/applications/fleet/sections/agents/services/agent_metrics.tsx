/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';

import type { AgentMetrics, AgentPolicy, Agent } from '../../../../../../common/types';

import { MetricNonAvailable } from '../components';

export function formatAgentCPU(metrics?: AgentMetrics, agentPolicy?: AgentPolicy) {
  return typeof metrics?.cpu_avg !== 'undefined' ? (
    <EuiToolTip content={`${(metrics.cpu_avg * 100).toFixed(4)} %`}>
      <>{(metrics.cpu_avg * 100).toFixed(2)} %</>
    </EuiToolTip>
  ) : (
    <MetricNonAvailable agentPolicy={agentPolicy} />
  );
}
export function formatAgentCPULimit(agent: Agent, agentPolicy?: AgentPolicy) {
  if (
    agentPolicy?.revision !== agent.policy_revision ||
    !agentPolicy?.advanced_settings?.agent_limits_cpu
  ) {
    return <MetricNonAvailable agentPolicy={agentPolicy} />;
  } else {
    return `${agentPolicy?.advanced_settings?.agent_limits_cpu + ' %'}`;
  }
}
export function formatAgentMemory(metrics?: AgentMetrics, agentPolicy?: AgentPolicy) {
  return metrics?.memory_size_byte_avg ? (
    formatBytes(metrics.memory_size_byte_avg)
  ) : (
    <MetricNonAvailable agentPolicy={agentPolicy} />
  );
}

export function formatBytes(bytes: number, decimals = 0) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
