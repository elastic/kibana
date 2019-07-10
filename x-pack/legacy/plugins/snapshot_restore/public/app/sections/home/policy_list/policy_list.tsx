/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { SectionError, SectionLoading } from '../../../components';
import { UIM_POLICY_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useLoadPolicies } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';

import { PolicyTable } from './policy_table';

export const PolicyList: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const {
    error,
    loading,
    data: { policies } = {
      policies: undefined,
    },
    request: reload,
  } = useLoadPolicies();

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_POLICY_LIST_LOAD);
  }, []);

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.policyList.loadingPoliciesDescription"
          defaultMessage="Loading policies…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyList.LoadingPoliciesErrorMessage"
            defaultMessage="Error loading policies"
          />
        }
        error={error}
      />
    );
  } else if (policies && policies.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.policyList.emptyPromptTitle"
              defaultMessage="You don't have any snapshot policies yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.policyList.emptyPromptDescription"
                defaultMessage="Use policies to schedule automatic backups of your cluster."
              />
            </p>
          </Fragment>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    content = <PolicyTable policies={policies || []} reload={reload} />;
  }

  return <section data-test-subj="policyList">{content}</section>;
};
