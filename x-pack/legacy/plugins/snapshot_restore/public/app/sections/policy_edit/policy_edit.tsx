/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';

import { SectionError, SectionLoading, PolicyForm, Error } from '../../components';
import { BASE_PATH } from '../../constants';
import { useAppDependencies } from '../../index';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { editPolicy, useLoadPolicy, useLoadIndicies } from '../../services/http';

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

  const {
    error: errorLoadingIndices,
    isLoading: isLoadingIndices,
    data: { indices } = {
      indices: [],
    },
  } = useLoadIndicies();

  // Load policy
  const { error: errorLoadingPolicy, isLoading: isLoadingPolicy, data: policyData } = useLoadPolicy(
    name
  );

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
      history.push(`${BASE_PATH}/policies/${name}`);
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/policies/${name}`);
  };

  const renderLoading = () => {
    return errorLoadingPolicy ? (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editPolicy.loadingPolicyDescription"
          defaultMessage="Loading policy details…"
        />
      </SectionLoading>
    ) : (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.editPolicy.loadingIndicesDescription"
          defaultMessage="Loading available indices…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    if (errorLoadingPolicy) {
      const notFound = (errorLoadingPolicy as any).status === 404;
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
        : errorLoadingPolicy;
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.editPolicy.loadingPolicyErrorTitle"
              defaultMessage="Error loading policy details"
            />
          }
          error={errorObject as Error}
        />
      );
    }

    if (errorLoadingIndices) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.editPolicy.LoadingIndicesErrorMessage"
              defaultMessage="Error loading available indices"
            />
          }
          error={errorLoadingIndices as Error}
        />
      );
    }
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
    if (isLoadingPolicy || isLoadingIndices) {
      return renderLoading();
    }
    if (errorLoadingPolicy || errorLoadingIndices) {
      return renderError();
    }

    return (
      <Fragment>
        <PolicyForm
          policy={policy}
          indices={indices}
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
