/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '../../../common';

const STATUS_PRESENTATION: Record<InvestigationStatus, { label: string; color: string }> = {
  pending: {
    label: i18n.translate('xpack.nightshiftInvestigations.statusPending', {
      defaultMessage: 'Pending',
    }),
    color: 'hollow',
  },
  running: {
    label: i18n.translate('xpack.nightshiftInvestigations.statusRunning', {
      defaultMessage: 'Running',
    }),
    color: 'primary',
  },
  completed: {
    label: i18n.translate('xpack.nightshiftInvestigations.statusCompleted', {
      defaultMessage: 'Completed',
    }),
    color: 'success',
  },
  failed: {
    label: i18n.translate('xpack.nightshiftInvestigations.statusFailed', {
      defaultMessage: 'Failed',
    }),
    color: 'danger',
  },
  cancelled: {
    label: i18n.translate('xpack.nightshiftInvestigations.statusCancelled', {
      defaultMessage: 'Cancelled',
    }),
    color: 'hollow',
  },
};

export function InvestigationRunStatusBadge({
  status,
}: {
  status: InvestigationStatus;
}): React.ReactElement {
  const { label, color } = STATUS_PRESENTATION[status];
  return <EuiBadge color={color}>{label}</EuiBadge>;
}
