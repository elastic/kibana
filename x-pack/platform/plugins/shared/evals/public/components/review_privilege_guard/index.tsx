/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';

const NO_REVIEW_PRIVILEGE_TITLE = i18n.translate('xpack.evals.reviewQueues.noPrivilege.title', {
  defaultMessage: 'Review queues require the evals "All" privilege',
});

const NO_REVIEW_PRIVILEGE_BODY = i18n.translate('xpack.evals.reviewQueues.noPrivilege.body', {
  defaultMessage:
    'Browsing and reviewing queues requires the evals "All" privilege. Ask an administrator to update your role.',
});

/**
 * Every review route answers 403 without the review privilege. Children own the review
 * queries, so they only mount once the privilege is confirmed and no doomed request is sent.
 */
export const ReviewPrivilegeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { canReview } = useEvalsPermissions();

  if (!canReview) {
    return (
      <EuiCallOut
        announceOnMount
        title={NO_REVIEW_PRIVILEGE_TITLE}
        data-test-subj="evalsReviewNoPrivilege"
      >
        {NO_REVIEW_PRIVILEGE_BODY}
      </EuiCallOut>
    );
  }

  return <>{children}</>;
};
