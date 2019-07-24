/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EuiEmptyPrompt } from '@elastic/eui';
import { SlmPolicy } from '../../../../../common/types';
import { SectionError, SectionLoading } from '../../../components';
import { BASE_PATH, UIM_POLICY_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useLoadPolicies } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';

import { PolicyDetails } from './policy_details';
import { PolicyTable } from './policy_table';

interface MatchParams {
  policyName?: SlmPolicy['name'];
}

export const PolicyList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { policyName },
  },
  history,
}) => {
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

  const openPolicyDetailsUrl = (newPolicyName: SlmPolicy['name']): string => {
    return history.createHref({
      pathname: `${BASE_PATH}/policies/${newPolicyName}`,
    });
  };

  const closePolicyDetails = () => {
    history.push(`${BASE_PATH}/policies`);
  };

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
    content = (
      <PolicyTable
        policies={policies || []}
        reload={reload}
        openPolicyDetailsUrl={openPolicyDetailsUrl}
      />
    );
  }

  return (
    <section data-test-subj="policyList">
      {policyName ? <PolicyDetails policyName={policyName} onClose={closePolicyDetails} /> : null}
      {content}
    </section>
  );
};
