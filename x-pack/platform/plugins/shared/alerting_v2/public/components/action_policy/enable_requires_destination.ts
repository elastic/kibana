/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENABLE_REQUIRES_DESTINATION_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicy.enableRequiresDestination',
  { defaultMessage: 'Add a destination before enabling this action policy' }
);

export const actionPolicyHasDestination = (policy: {
  destinations?: readonly unknown[] | null;
}): boolean => (policy.destinations?.length ?? 0) > 0;

/** True when the policy can be turned on (already on, or has at least one destination). */
export const canEnableActionPolicy = (policy: {
  enabled: boolean;
  destinations?: readonly unknown[] | null;
}): boolean => policy.enabled || actionPolicyHasDestination(policy);
