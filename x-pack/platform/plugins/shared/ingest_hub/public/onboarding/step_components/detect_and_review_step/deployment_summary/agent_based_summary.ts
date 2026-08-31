/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Agent-based summary fields — inert until #9079 supplies agent policy names,
// enrollment tokens, and agent counts. Fields are typed and tested so the
// branch is covered before it is reachable via DeploymentMethodCard.

import { i18n } from '@kbn/i18n';

import type { SummaryField } from './managed_integration_summary';

export function getAgentBasedSummaryFields(): SummaryField[] {
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
      // Agent policy name — blocked on #9079
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.agentPolicy',
      defaultMessage: 'Agent policy',
      value: null,
    },
    {
      // Enrollment token — blocked on #9079
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.enrollmentToken',
      defaultMessage: 'Enrollment token',
      value: null,
    },
    {
      // Agent count — blocked on #9079
      labelId: 'xpack.ingestHub.detectAndReviewStep.deploymentSummary.field.agents',
      defaultMessage: 'Agents',
      value: null,
    },
  ];
}
