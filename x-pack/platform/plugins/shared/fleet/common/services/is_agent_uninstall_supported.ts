/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../types';

export const UNINSTALL_DELAY_DEFAULT_SECONDS = 60 * 60;
export const UNINSTALL_DELAY_MIN_SECONDS = 60 * 60;
export const UNINSTALL_DELAY_MAX_SECONDS = 24 * 60 * 60;

export type AgentUninstallIneligibleReason = 'not_supported' | 'unprivileged' | 'not_unenrolled';

/** Returns why the agent cannot receive the UNINSTALL action, or undefined when it can. */
export const getAgentUninstallIneligibleReason = (
  agent: Pick<Agent, 'active' | 'uninstall_pending' | 'local_metadata'>
): AgentUninstallIneligibleReason | undefined => {
  const agentMetadata = agent.local_metadata?.elastic?.agent;
  if (!agent.active || agentMetadata?.uninstallable !== true) {
    return 'not_supported';
  }
  if (agentMetadata.unprivileged === true) {
    return 'unprivileged';
  }
  if (agent.uninstall_pending !== true) {
    return 'not_unenrolled';
  }
};

/** Whether the agent advertises the `uninstallable` capability, regardless of its current state. */
export const isAgentUninstallCapable = (agent: Pick<Agent, 'local_metadata'>): boolean =>
  agent.local_metadata?.elastic?.agent?.uninstallable === true;

export const isAgentUninstallSupported = (
  agent: Pick<Agent, 'active' | 'uninstall_pending' | 'local_metadata'>
): boolean => getAgentUninstallIneligibleReason(agent) === undefined;

export const isUninstallDelayValid = (delaySeconds: number): boolean =>
  Number.isInteger(delaySeconds) &&
  delaySeconds >= UNINSTALL_DELAY_MIN_SECONDS &&
  delaySeconds <= UNINSTALL_DELAY_MAX_SECONDS;
