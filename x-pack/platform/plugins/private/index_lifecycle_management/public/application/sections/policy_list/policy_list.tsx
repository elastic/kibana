/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiSpacer, EuiPageHeader, EuiPageTemplate } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { usePolicyListContext } from './policy_list_context';
import { useIsReadOnly } from '../../lib/use_is_read_only';
import { PolicyFromES } from '../../../../common/types';
import { getPoliciesListPath, getPolicyCreatePath } from '../../services/navigation';
import { PolicyTable, ListActionHandler } from './components';
import { ViewPolicyFlyout } from './policy_flyout';

interface Props {
  policies: PolicyFromES[];
  updatePolicies: () => void;
}

export const PolicyList: React.FunctionComponent<Props> = ({ policies, updatePolicies }) => {
  const history = useHistory();
  const isReadOnly = useIsReadOnly();
  const { setListAction } = usePolicyListContext();
  const [flyoutPolicy, setFlyoutPolicy] = useState<PolicyFromES | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const policyParam = decodeURIComponent(params.get('policy') ?? '');
    const policyFromParam = policies.find((policy) => policy.name === policyParam);
    if (policyFromParam) {
      setFlyoutPolicy(policyFromParam);
    } else {
      setFlyoutPolicy(null);
    }
  }, [history.location.search, policies, setListAction]);

  const createPolicyButton = (
    <EuiButton
      {...reactRouterNavigate(history, getPolicyCreatePath())}
      fill
      iconType="plusInCircle"
      data-test-subj="createPolicyButton"
    >
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel"
        defaultMessage="Create policy"
      />
    </EuiButton>
  );

  if (policies.length === 0) {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
              defaultMessage="Create your first index lifecycle policy"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.emptyPromptDescription"
                defaultMessage=" An index lifecycle policy helps you manage your indices as they age."
              />
            </p>
          </Fragment>
        }
        actions={createPolicyButton}
      />
    );
  }

  const rightSideItems = isReadOnly ? [] : [createPolicyButton];
  return (
    <>
      <ListActionHandler
        deletePolicyCallback={() => {
          // if a flyout was open, then close it
          history.push(getPoliciesListPath());
          // update the policies in the list after 1 was deleted
          updatePolicies();
        }}
      />

      <EuiPageHeader
        pageTitle={
          <span data-test-subj="ilmPageHeader">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
              defaultMessage="Index Lifecycle Policies"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
            defaultMessage="Manage your indices as they age.  Attach a policy to automate
                        when and how to transition an index through its lifecycle."
          />
        }
        bottomBorder
        rightSideItems={rightSideItems}
      />

      <EuiSpacer size="l" />

      <PolicyTable policies={policies} />

      {flyoutPolicy && <ViewPolicyFlyout policy={flyoutPolicy} />}
    </>
  );
};
