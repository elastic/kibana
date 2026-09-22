/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useProfileFormContext } from './profile_form_context';

export const ProfileFormFooter = () => {
  const { isManageMode, isSubmitting, onCancel, onSubmit, targetIdField } = useProfileFormContext();
  const isSubmitDisabled =
    !isManageMode ||
    isSubmitting ||
    Boolean(targetIdField.targetIdAsyncError) ||
    targetIdField.isTargetIdValidating;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onCancel}>
          <FormattedMessage id="anonymizationUi.form.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={() => void onSubmit()}
          isLoading={isSubmitting || targetIdField.isTargetIdValidating}
          isDisabled={isSubmitDisabled}
          data-test-subj="anonymizationProfilesSubmitProfile"
        >
          <FormattedMessage id="anonymizationUi.form.save" defaultMessage="Save profile" />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
