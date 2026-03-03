/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import {
  toCreatePayload,
  toFormState,
  toUpdatePayload,
} from '../../components/notification_policy/form';
import { DEFAULT_FORM_STATE } from '../../components/notification_policy/form/constants';
import { NotificationPolicyForm } from '../../components/notification_policy/form/notification_policy_form';
import type { NotificationPolicyFormState } from '../../components/notification_policy/form/types';
import { paths } from '../../constants';
import { useCreateNotificationPolicy } from '../../hooks/use_create_notification_policy';
import { useFetchNotificationPolicy } from '../../hooks/use_fetch_notification_policy';
import { useUpdateNotificationPolicy } from '../../hooks/use_update_notification_policy';

export const NotificationPolicyFormPage = () => {
  const { id: policyId } = useParams<{ id?: string }>();
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const {
    data: existingPolicy,
    isLoading: isFetchingPolicy,
    isError: isFetchError,
    error: fetchError,
  } = useFetchNotificationPolicy(policyId);

  const isEditMode = !!policyId;
  const isReady = !isEditMode || !!existingPolicy;

  const navigateToList = () => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyList));
  };

  if (isEditMode && isFetchingPolicy) {
    return (
      <>
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.editTitle"
              defaultMessage="Edit notification policy"
            />
          }
        />
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="center">
          <EuiLoadingSpinner size="l" data-test-subj="loadingSpinner" />
        </EuiFlexGroup>
      </>
    );
  }

  if (isEditMode && isFetchError) {
    return (
      <>
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.editTitle"
              defaultMessage="Edit notification policy"
            />
          }
        />
        <EuiSpacer size="m" />
        <EuiCallOut
          announceOnMount
          title={
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.fetchErrorTitle"
              defaultMessage="Failed to load notification policy"
            />
          }
          color="danger"
          iconType="error"
          data-test-subj="fetchErrorCallout"
        >
          {fetchError?.message}
        </EuiCallOut>
      </>
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <NotificationPolicyFormPageContent
      isEditMode={isEditMode}
      initialPolicy={existingPolicy}
      onCancel={navigateToList}
      onSuccess={navigateToList}
    />
  );
};

const NotificationPolicyFormPageContent = ({
  isEditMode,
  initialPolicy,
  onCancel,
  onSuccess,
}: {
  isEditMode: boolean;
  initialPolicy?: NotificationPolicyResponse;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const { mutate: createPolicy, isLoading: isCreating } = useCreateNotificationPolicy();
  const { mutate: updatePolicy, isLoading: isUpdating } = useUpdateNotificationPolicy();

  const methods = useForm<NotificationPolicyFormState>({
    mode: 'onBlur',
    defaultValues: isEditMode && initialPolicy ? toFormState(initialPolicy) : DEFAULT_FORM_STATE,
  });

  const onSubmitValid = (values: NotificationPolicyFormState) => {
    if (isEditMode && initialPolicy?.version) {
      updatePolicy(
        { id: initialPolicy.id, data: toUpdatePayload(values, initialPolicy.version) },
        { onSuccess }
      );
    } else {
      createPolicy(toCreatePayload(values), { onSuccess });
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <>
      <EuiPageHeader
        pageTitle={
          isEditMode ? (
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.editTitle"
              defaultMessage="Edit notification policy"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.createTitle"
              defaultMessage="Create notification policy"
            />
          )
        }
        data-test-subj="pageTitle"
      />
      <EuiSpacer size="m" />
      <FormProvider {...methods}>
        <NotificationPolicyForm />
      </FormProvider>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
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
                id="xpack.alertingV2.notificationPolicy.formPage.update"
                defaultMessage="Update"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.formPage.save"
                defaultMessage="Save"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} isLoading={isLoading} data-test-subj="cancelButton">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.formPage.cancel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
