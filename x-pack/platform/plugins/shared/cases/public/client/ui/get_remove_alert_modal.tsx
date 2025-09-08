/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { type RemoveAlertModalProps } from '../../components/case_view/components/remove_alert_from_case_modal';

export const getRemoveAlertFromCaseModal = ({
  caseId,
  alertId,
  onClose,
  onSuccess,
}: RemoveAlertModalProps) => (
  <RemoveAlertFromCaseModalLazy
    caseId={caseId}
    alertId={alertId}
    onClose={onClose}
    onSuccess={onSuccess}
  />
);

export const RemoveAlertFromCaseModalLazy: React.FC<RemoveAlertModalProps> = lazy(
  () => import('../../components/case_view/components/remove_alert_from_case_modal')
);

export const getCreateCaseFlyoutLazyNoProvider = (props: RemoveAlertModalProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <RemoveAlertFromCaseModalLazy {...props} />
  </Suspense>
);
