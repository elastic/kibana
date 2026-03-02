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
import type { CreateNotificationPolicyData } from '@kbn/alerting-v2-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { NotificationPolicyForm } from './notification_policy_form';
import type { NotificationPolicyFormState } from './types';

const FLYOUT_TITLE_ID = 'notificationPolicyFlyoutTitle';

const DEFAULT_FORM_STATE: NotificationPolicyFormState = {
  name: '',
  description: '',
  matcher: '',
  groupBy: [],
  frequency: { type: 'immediate' },
  workflowId: 'workflow-1',
};

function toCreatePayload(state: NotificationPolicyFormState): CreateNotificationPolicyData {
  return {
    name: state.name,
    description: state.description,
    ...(state.matcher ? { matcher: state.matcher } : {}),
    ...(state.groupBy.length > 0 ? { group_by: state.groupBy } : {}),
    ...(state.frequency.type === 'throttle'
      ? { throttle: { interval: state.frequency.interval } }
      : {}),
    destinations: [{ type: 'workflow' as const, id: state.workflowId }],
  };
}

export interface NotificationPolicyFlyoutProps {
  onClose: () => void;
  onSave: (data: CreateNotificationPolicyData) => void;
  isLoading?: boolean;
  initialValues?: Partial<NotificationPolicyFormState>;
}

export const NotificationPolicyFlyout = ({
  onClose,
  onSave,
  isLoading = false,
  initialValues,
}: NotificationPolicyFlyoutProps) => {
  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues: { ...DEFAULT_FORM_STATE, ...initialValues },
  });

  const onSubmitValid = (values: NotificationPolicyFormState) => {
    onSave(toCreatePayload(values));
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={FLYOUT_TITLE_ID} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.flyout.title"
              defaultMessage="Create notification policy"
            />
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
            <EuiButtonEmpty onClick={onClose} isLoading={isLoading}>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.flyout.cancel"
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
            >
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.flyout.save"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
