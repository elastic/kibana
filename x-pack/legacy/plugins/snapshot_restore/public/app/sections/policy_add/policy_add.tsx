/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';

import { PolicyForm, SectionError } from '../../components';
import { useAppDependencies } from '../../index';
import { BASE_PATH } from '../../constants';
import { breadcrumbService } from '../../services/navigation';
import { addPolicy } from '../../services/http';

export const PolicyAdd: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policyAdd');
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
      history.push(`${BASE_PATH}/policy/${name}`);
    }
  };

  const emptyPolicy: SlmPolicyPayload = {
    name: '',
    snapshotName: '',
    schedule: '',
    repository: '',
    config: {},
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
        <PolicyForm
          policy={emptyPolicy}
          isSaving={isSaving}
          saveError={renderSaveError()}
          clearSaveError={clearSaveError}
          onSave={onSave}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
