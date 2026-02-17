/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useProfileFlyoutContext } from './context';

export const ProfileFlyoutFooter = () => {
  const { isManageMode, isSubmitting, onCancel, onSubmit, targetIdField } =
    useProfileFlyoutContext();
  const isSubmitDisabled =
    !isManageMode ||
    isSubmitting ||
    Boolean(targetIdField.targetIdAsyncError) ||
    targetIdField.isTargetIdValidating;

  return (
    <EuiFlyoutFooter>
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
    </EuiFlyoutFooter>
  );
};
