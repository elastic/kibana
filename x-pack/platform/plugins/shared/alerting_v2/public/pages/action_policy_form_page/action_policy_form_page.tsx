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
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import type {
  CreateActionPolicyData,
  ActionPolicyResponse,
  UpdateActionPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { FormProvider } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ActionPolicyForm } from '../../components/action_policy/form/action_policy_form';
import { useActionPolicyForm } from '../../components/action_policy/form/use_action_policy_form';
import { paths } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useCreateActionPolicy } from '../../hooks/use_create_action_policy';
import { useFetchActionPolicy } from '../../hooks/use_fetch_action_policy';
import { useUpdateActionPolicy } from '../../hooks/use_update_action_policy';

export const ActionPolicyFormPage = () => {
  const { id: policyId } = useParams<{ id?: string }>();
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const {
    data: existingPolicy,
    isLoading: isFetchingPolicy,
    isError: isFetchError,
    error: fetchError,
  } = useFetchActionPolicy(policyId);

  const isEditMode = !!policyId;
  useBreadcrumbs(isEditMode ? 'action_policy_edit' : 'action_policy_create');
  const isReady = !isEditMode || !!existingPolicy;

  const navigateToList = useCallback(() => {
    navigateToUrl(basePath.prepend(paths.actionPolicyList));
  }, [navigateToUrl, basePath]);

  const returnButton = (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={navigateToList}
          data-test-subj="returnButton"
          style={{ paddingInline: 0 }}
        >
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.formPage.return"
            defaultMessage="Return"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (isEditMode && isFetchingPolicy) {
    return (
      <>
        {returnButton}
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.editTitle"
              defaultMessage="Edit action policy"
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
        {returnButton}
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.editTitle"
              defaultMessage="Edit action policy"
            />
          }
        />
        <EuiSpacer size="m" />
        <EuiCallOut
          announceOnMount
          title={
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.fetchErrorTitle"
              defaultMessage="Failed to load action policy"
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
    <ActionPolicyFormPageContent
      initialPolicy={existingPolicy}
      onCancel={navigateToList}
      onSuccess={navigateToList}
    />
  );
};

const ActionPolicyFormPageContent = ({
  initialPolicy,
  onCancel,
  onSuccess,
}: {
  initialPolicy?: ActionPolicyResponse;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const { mutate: createPolicy, isLoading: isCreating } = useCreateActionPolicy();
  const { mutate: updatePolicy, isLoading: isUpdating } = useUpdateActionPolicy();

  const onSubmitCreate = (data: CreateActionPolicyData) => createPolicy(data, { onSuccess });
  const onSubmitUpdate = (id: string, data: UpdateActionPolicyBody) =>
    updatePolicy({ id, data }, { onSuccess });

  const { methods, isEditMode, isSubmitEnabled, handleSubmit } = useActionPolicyForm({
    initialValues: initialPolicy,
    onSubmitCreate,
    onSubmitUpdate,
  });

  const isLoading = isCreating || isUpdating;

  return (
    <EuiPageTemplate.Section paddingSize="none" restrictWidth={true}>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="arrowLeft"
            onClick={onCancel}
            data-test-subj="returnButton"
            style={{ paddingInline: 0 }}
          >
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.return"
              defaultMessage="Return"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiPageHeader
        pageTitle={
          isEditMode ? (
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.editTitle"
              defaultMessage="Edit action policy"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.createTitle"
              defaultMessage="Create action policy"
            />
          )
        }
        data-test-subj="pageTitle"
      />
      <EuiSpacer size="m" />

      <FormProvider {...methods}>
        <ActionPolicyForm />
      </FormProvider>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} isLoading={isLoading} data-test-subj="cancelButton">
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.formPage.cancel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!isSubmitEnabled}
            data-test-subj="submitButton"
          >
            {isEditMode ? (
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.formPage.update"
                defaultMessage="Update policy"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.formPage.save"
                defaultMessage="Create policy"
              />
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
