/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  RemoveAlertFromCaseModal,
  type RemoveAlertModalProps,
} from '../../components/case_view/components/remove_alert_from_case_modal';

export const getRemoveAlertFromCaseModal = ({
  caseId,
  alertId,
  onClose,
  onSuccess,
}: RemoveAlertModalProps) => (
  <RemoveAlertFromCaseModal
    caseId={caseId}
    alertId={alertId}
    onClose={onClose}
    onSuccess={onSuccess}
  />
);
