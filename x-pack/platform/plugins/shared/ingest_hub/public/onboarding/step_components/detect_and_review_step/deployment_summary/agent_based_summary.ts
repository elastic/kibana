/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { SummaryField } from './managed_integration_summary';

interface AgentBasedSummaryOpts {
  agentPolicyName?: string;
  /** Token name (e.g. "Default") — displayed as plain text, not the raw API key value */
  enrollmentToken?: string;
  agentCount?: number;
}

export function getAgentBasedSummaryFields(opts: AgentBasedSummaryOpts = {}): SummaryField[] {
  const { agentPolicyName, enrollmentToken, agentCount } = opts;

  return [
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.deploymentMethod',
      defaultMessage: 'Deployment method',
      value: i18n.translate(
        'xpack.ingestHub.detectAndReviewStep.deploymentSummary.value.agentBased',
        { defaultMessage: 'Agent-based' }
      ),
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.agentPolicy',
      defaultMessage: 'Agent policy',
      // null until the agent policy name is available from session storage — filtered out
      // by use_deployment_summary.ts so the field only appears once populated.
      value: agentPolicyName ?? null,
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.enrollmentToken',
      defaultMessage: 'Enrollment token',
      // null until the enrollment token name is fetched live — filtered out until available.
      value: enrollmentToken ?? null,
    },
    {
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.agents',
      defaultMessage: 'Agents',
      value:
        agentCount !== undefined
          ? i18n.translate(
              'xpack.ingestHub.detectAndReviewStep.deploymentSummary.value.agentCount',
              {
                defaultMessage: '{count, plural, one {# agent enrolled} other {# agents enrolled}}',
                values: { count: agentCount },
              }
            )
          : null,
    },
  ];
}
