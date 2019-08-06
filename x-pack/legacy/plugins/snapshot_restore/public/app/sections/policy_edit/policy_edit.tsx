/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';

import { SectionError, SectionLoading, PolicyForm } from '../../components';
import { BASE_PATH } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { editPolicy, useLoadPolicy } from '../../services/http';

interface MatchParams {
  name: string;
}

export const PolicyEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
  location: { pathname },
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policyEdit');
    docTitleService.setTitle('policyEdit');
  }, []);

  // Policy state with default empty policy
  const [policy, setPolicy] = useState<SlmPolicyPayload>({
    name: '',
    snapshotName: '',
    schedule: '',
    repository: '',
    config: {},
  });

  // Load policy
  const { error: policyError, isLoading: loadingPolicy, data: policyData } = useLoadPolicy(name);

  // Update policy state when data is loaded
  useEffect(() => {
    if (policyData && policyData.policy) {
      setPolicy(policyData.policy);
    }
  }, [policyData]);

  // Saving policy states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Save policy
  const onSave = async (editedPolicy: SlmPolicyPayload) => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await editPolicy(editedPolicy);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(`${BASE_PATH}/policies/${encodeURIComponent(name)}`);
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/policies/${encodeURIComponent(name)}`);
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editPolicy.loadingPolicyDescription"
          defaultMessage="Loading policy details…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = policyError.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate('xpack.snapshotRestore.editPolicy.policyNotFoundErrorMessage', {
              defaultMessage: `The policy '{name}' does not exist.`,
              values: {
                name,
              },
            }),
          },
        }
      : policyError;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editPolicy.loadingPolicyErrorTitle"
            defaultMessage="Error loading policy details"
          />
        }
        error={errorObject}
      />
    );
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.editPolicy.savingPolicyErrorTitle"
            defaultMessage="Cannot save policy"
          />
        }
        error={saveError}
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  const renderContent = () => {
    if (loadingPolicy) {
      return renderLoading();
    }
    if (policyError) {
      return renderError();
    }

    return (
      <Fragment>
        <PolicyForm
          policy={policy}
          currentUrl={pathname}
          isEditing={true}
          isSaving={isSaving}
          saveError={renderSaveError()}
          clearSaveError={clearSaveError}
          onSave={onSave}
          onCancel={onCancel}
        />
      </Fragment>
    );
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.editPolicyTitle"
              defaultMessage="Edit policy"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {renderContent()}
      </EuiPageContent>
    </EuiPageBody>
  );
};
