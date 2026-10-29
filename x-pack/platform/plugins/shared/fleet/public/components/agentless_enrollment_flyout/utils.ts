/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, PackagePolicy } from '../../types';
import {
  getComponentAlertLevel,
  getPackagePolicyUnitSummary,
} from '../agentless_status_details_flyout/component_alert_level';

import type { AgentlessEnrollmentSelectedInput } from './types';

export type AgentlessEnrollmentState = 'pending' | 'success' | 'failure';

/**
 * Whether the managed integration was deployed. With the package policy known, it is judged by the
 * units of that package policy, like the component health shown below it: an agent in error or
 * degraded only because of something else it runs, like its monitoring, still runs the integration.
 */
export const getAgentlessEnrollmentState = (
  agent?: Agent,
  packagePolicy?: PackagePolicy
): AgentlessEnrollmentState => {
  if (!agent) return 'pending';
  const { status } = agent;
  const isFailing = status === 'error' || status === 'degraded';
  if (status !== 'online' && !isFailing) return 'pending';
  if (!packagePolicy) return isFailing ? 'failure' : 'success';

  const alertLevel = getComponentAlertLevel(agent, packagePolicy);
  if (alertLevel === 'failed') return 'failure';
  if (!isFailing) return 'success';
  const units = getPackagePolicyUnitSummary(agent, packagePolicy);
  const runsIntegration = units.total > units.stopped;
  return runsIntegration && !alertLevel ? 'success' : 'failure';
};

/** The agent reports a problem, but not with the units of the managed integration. */
export const isAgentFailingElsewhere = (agent?: Agent, packagePolicy?: PackagePolicy): boolean =>
  (agent?.status === 'error' || agent?.status === 'degraded') &&
  getAgentlessEnrollmentState(agent, packagePolicy) === 'success';

/** Minimal shape needed from the package's policy templates to resolve a title. */
interface IntegrationTitleSource {
  name: string;
  inputs?: Array<{ type: string; title?: string }>;
}

/**
 * Resolves the integration title shown in the enrollment copy. When a single input
 * is selected, prefer that input's title from the package's policy templates
 * (e.g. "AWS S3"); otherwise fall back to the package title, then the policy name.
 */
export const resolveIntegrationTitle = ({
  packageTitle,
  policyTemplates,
  selectedInput,
  fallbackName,
}: {
  packageTitle?: string;
  policyTemplates?: IntegrationTitleSource[];
  selectedInput?: AgentlessEnrollmentSelectedInput;
  fallbackName: string;
}): string => {
  if (!packageTitle) {
    return fallbackName;
  }
  if (!selectedInput) {
    return packageTitle;
  }
  const policyTemplate = policyTemplates?.find(
    (template) => template.name === selectedInput.policyTemplate
  );
  const input = policyTemplate?.inputs?.find((i) => i.type === selectedInput.type);
  return input?.title || packageTitle;
};
