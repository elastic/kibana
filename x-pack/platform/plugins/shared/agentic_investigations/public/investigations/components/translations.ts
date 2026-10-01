/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationSeverity } from '../../../common';

export const INVESTIGATION_SEVERITY_LABELS: Record<InvestigationSeverity, string> = {
  low: i18n.translate('xpack.agenticInvestigations.investigations.severity.low', {
    defaultMessage: 'Low',
  }),
  medium: i18n.translate('xpack.agenticInvestigations.investigations.severity.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.agenticInvestigations.investigations.severity.high', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.agenticInvestigations.investigations.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const INVESTIGATION_SEVERITY_COLORS: Record<
  InvestigationSeverity,
  'danger' | 'warning' | 'primary' | 'success'
> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'success',
};

export const RUNNING_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.runningLabel',
  { defaultMessage: 'Investigating…' }
);

export const NO_SEVERITY_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.noSeverityLabel',
  { defaultMessage: 'Not rated' }
);

export const CLOSED_LABEL = i18n.translate(
  'xpack.agenticInvestigations.investigations.closedLabel',
  { defaultMessage: 'Closed' }
);

export const pendingProposalsLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.investigations.pendingProposals', {
    defaultMessage: '{count, plural, one {# proposal to review} other {# proposals to review}}',
    values: { count },
  });

export const moreSubjectsLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.investigations.moreSubjects', {
    defaultMessage: '+{count}',
    values: { count },
  });
