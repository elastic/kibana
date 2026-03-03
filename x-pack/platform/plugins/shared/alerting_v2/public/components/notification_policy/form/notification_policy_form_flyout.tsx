/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { toCreatePayload, toFormState, toUpdatePayload } from './form_utils';
import { NotificationPolicyForm } from './notification_policy_form';
import type { NotificationPolicyFormState } from './types';

const FLYOUT_TITLE_ID = 'notificationPolicyFlyoutTitle';

interface NotificationPolicyFormFlyoutProps {
  onClose: () => void;
  onSave?: (data: CreateNotificationPolicyData) => void;
  onUpdate?: (id: string, data: UpdateNotificationPolicyBody) => void;
  isLoading?: boolean;
  initialValues?: NotificationPolicyResponse;
}

export const NotificationPolicyFormFlyout = ({
  onClose,
  onSave,
  onUpdate,
  isLoading = false,
  initialValues,
}: NotificationPolicyFormFlyoutProps) => {
  const isEditMode = !!initialValues;

  const defaultValues = useMemo(
    () => (initialValues ? toFormState(initialValues) : DEFAULT_FORM_STATE),
    [initialValues]
  );

  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues,
  });

  const onSubmitValid = (values: NotificationPolicyFormState) => {
    if (isEditMode && onUpdate && initialValues.version) {
      onUpdate(initialValues.id, toUpdatePayload(values, initialValues.version));
    } else if (!isEditMode && onSave) {
      onSave(toCreatePayload(values));
    }
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={FLYOUT_TITLE_ID} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
          <h2 data-test-subj="title">
            {isEditMode ? (
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.formFlyout.editTitle"
                defaultMessage="Edit notification policy"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.formFlyout.title"
                defaultMessage="Create notification policy"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormProvider {...methods}>
          <NotificationPolicyForm />
        </FormProvider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isLoading={isLoading} data-test-subj="cancelButton">
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.formFlyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={methods.handleSubmit(onSubmitValid)}
              isLoading={isLoading}
              disabled={!methods.formState.isValid}
              data-test-subj="submitButton"
            >
              {isEditMode ? (
                <FormattedMessage
                  id="xpack.alertingV2.notificationPolicy.formFlyout.update"
                  defaultMessage="Update"
                />
              ) : (
                <FormattedMessage
                  id="xpack.alertingV2.notificationPolicy.formFlyout.save"
                  defaultMessage="Save"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
