/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';
import { TIME_UNITS } from '../../../../common/constants';

import { PolicyForm, SectionError, SectionLoading, Error } from '../../components';
import { useAppDependencies } from '../../index';
import { BASE_PATH, DEFAULT_POLICY_SCHEDULE } from '../../constants';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { addPolicy, useLoadIndices } from '../../services/http';

export const PolicyAdd: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { pathname },
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const {
    error: errorLoadingIndices,
    isLoading: isLoadingIndices,
    data: { indices } = {
      indices: [],
    },
  } = useLoadIndices();

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policyAdd');
    docTitleService.setTitle('policyAdd');
  }, []);

  const onSave = async (newPolicy: SlmPolicyPayload) => {
    setIsSaving(true);
    setSaveError(null);
    const { name } = newPolicy;
    const { error } = await addPolicy(newPolicy);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      history.push(`${BASE_PATH}/policies/${name}`);
    }
  };

  const onCancel = () => {
    history.push(`${BASE_PATH}/policies`);
  };

  const emptyPolicy: SlmPolicyPayload = {
    name: '',
    snapshotName: '',
    schedule: DEFAULT_POLICY_SCHEDULE,
    repository: '',
    config: {},
    retention: {
      expireAfterValue: '',
      expireAfterUnit: TIME_UNITS.DAY,
      maxCount: '',
      minCount: '',
    },
    isManagedPolicy: false,
  };

  const renderSaveError = () => {
    return saveError ? (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.addPolicy.savingPolicyErrorTitle"
            defaultMessage="Cannot create new policy"
          />
        }
        error={saveError}
        data-test-subj="savePolicyApiError"
      />
    ) : null;
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.snapshotRestore.addPolicyTitle"
              defaultMessage="Create policy"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {isLoadingIndices ? (
          <SectionLoading>
            <FormattedMessage
              id="xpack.snapshotRestore.addPolicy.loadingIndicesDescription"
              defaultMessage="Loading available indices…"
            />
          </SectionLoading>
        ) : errorLoadingIndices ? (
          <SectionError
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.addPolicy.LoadingIndicesErrorMessage"
                defaultMessage="Error loading available indices"
              />
            }
            error={errorLoadingIndices as Error}
          />
        ) : (
          <PolicyForm
            policy={emptyPolicy}
            indices={indices}
            currentUrl={pathname}
            isSaving={isSaving}
            saveError={renderSaveError()}
            clearSaveError={clearSaveError}
            onSave={onSave}
            onCancel={onCancel}
          />
        )}
      </EuiPageContent>
    </EuiPageBody>
  );
};
