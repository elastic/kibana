/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { EntityScope, LinkStatus } from '../../../../common/investigations/types';
import {
  CRITICALITY_BADGE_COLORS,
  LINK_STATUS_LABELS,
  SCOPE_STATUS_LABELS,
  SCOPE_STATUS_SHORT_LABELS,
  getCriticalityLabel,
  getCriticalityTone,
} from './scope_helpers';
import type { BadgeColor } from './scope_helpers';
import * as i18n from './translations';

export const CriticalityPill: React.FC<{ criticality?: string | null }> = ({ criticality }) => (
  <EuiBadge
    color={CRITICALITY_BADGE_COLORS[getCriticalityTone(criticality)]}
    data-test-subj="investigationScopeCriticality"
  >
    {getCriticalityLabel(criticality)}
  </EuiBadge>
);
CriticalityPill.displayName = 'CriticalityPill';

export const RiskChip: React.FC<{ score?: number | null }> = ({ score }) =>
  score === null || score === undefined ? null : (
    <EuiBadge color="hollow" data-test-subj="investigationScopeRisk">
      {i18n.RISK(score)}
    </EuiBadge>
  );
RiskChip.displayName = 'RiskChip';

const SCOPE_STATUS_COLORS: Record<EntityScope, BadgeColor> = {
  primary: 'primary',
  scoped: 'success',
  suspected: 'warning',
  dismissed: 'default',
  external: 'hollow',
};

export const ScopeStatusBadge: React.FC<{ status: EntityScope; short?: boolean }> = ({
  status,
  short = false,
}) => (
  <EuiBadge
    color={SCOPE_STATUS_COLORS[status]}
    data-test-subj={`investigationScopeStatus-${status}`}
  >
    {short ? SCOPE_STATUS_SHORT_LABELS[status] : SCOPE_STATUS_LABELS[status]}
  </EuiBadge>
);
ScopeStatusBadge.displayName = 'ScopeStatusBadge';

const LINK_STATUS_COLORS: Record<LinkStatus, BadgeColor> = {
  confirmed: 'success',
  suspected: 'warning',
  dismissed: 'default',
};

export const LinkStatusBadge: React.FC<{ status: LinkStatus }> = ({ status }) => (
  <EuiBadge color={LINK_STATUS_COLORS[status]} data-test-subj={`investigationLinkStatus-${status}`}>
    {LINK_STATUS_LABELS[status]}
  </EuiBadge>
);
LinkStatusBadge.displayName = 'LinkStatusBadge';
