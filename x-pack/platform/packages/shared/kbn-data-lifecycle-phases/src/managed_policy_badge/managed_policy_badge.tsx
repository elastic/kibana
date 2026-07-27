/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';

export interface ManagedPolicyBadgeProps {
  'data-test-subj'?: string;
  isDisabled?: boolean;
}

const managedBadgeLabel = i18n.translate('xpack.dataLifecyclePhases.managedPolicyBadge.label', {
  defaultMessage: 'Managed',
});

/**
 * Badge shown next to policies that are preconfigured and managed by Elastic
 * (`policy._meta.managed === true`). Matches the pattern used in the ILM policy list.
 */
export const ManagedPolicyBadge = ({
  'data-test-subj': dataTestSubj = 'managedPolicyBadge',
  isDisabled = false,
}: ManagedPolicyBadgeProps) => (
  <EuiBadge color="hollow" isDisabled={isDisabled} data-test-subj={dataTestSubj}>
    {managedBadgeLabel}
  </EuiBadge>
);
