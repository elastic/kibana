/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';

import { EuiButton, EuiLoadingSpinner, EuiSpacer, EuiPageTemplate } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { usePolicyListContext } from './policy_list_context';
import { useIsReadOnly } from '../../lib/use_is_read_only';
import type { PolicyFromES } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { getPoliciesListPath, getPolicyCreatePath } from '../../services/navigation';
import { PolicyTable, ListActionHandler } from './components';
import { ViewPolicyFlyout } from './policy_flyout';

const createPolicyButtonLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel',
  { defaultMessage: 'Create policy' }
);

const policyListTitle = i18n.translate('xpack.indexLifecycleMgmt.policyTable.sectionHeading', {
  defaultMessage: 'Index Lifecycle Policies',
});

const policyListDescription = i18n.translate(
  'xpack.indexLifecycleMgmt.policyTable.sectionDescription',
  {
    defaultMessage:
      'Manage your indices as they age.  Attach a policy to automate when and how to transition an index through its lifecycle.',
  }
);

interface Props {
  policies: PolicyFromES[];
  updatePolicies: () => void;
  isLoading?: boolean;
  error?: { statusCode?: number | string; message?: string } | null;
}

export const PolicyList: React.FunctionComponent<Props> = ({
  policies,
  updatePolicies,
  isLoading = false,
  error,
}) => {
  const history = useHistory();
  const {
    services: { docLinks },
  } = useKibana();
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

  const createPolicyPath = getPolicyCreatePath();
  const createPolicyButton = (
    <EuiButton
      {...reactRouterNavigate(history, createPolicyPath)}
      fill
      iconType="plusCircle"
      data-test-subj="createPolicyButton"
    >
      {createPolicyButtonLabel}
    </EuiButton>
  );

  const showCreateInHeader = !isLoading && !error && policies.length > 0 && !isReadOnly;
  const menu: AppHeaderMenu | undefined = showCreateInHeader
    ? {
        primaryActionItem: {
          id: 'createPolicy',
          label: createPolicyButtonLabel,
          iconType: 'plusCircle',
          testId: 'createPolicyButton',
          href: history.createHref({ pathname: createPolicyPath }),
          run: () => history.push(createPolicyPath),
        },
      }
    : undefined;

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.policiesLoading"
            defaultMessage="Loading policies..."
          />
        }
      />
    );
  } else if (error) {
    const { statusCode, message } = error;
    body = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.policiesLoadingFailedTitle"
              defaultMessage="Unable to load existing lifecycle policies"
            />
          </h2>
        }
        body={
          <p>
            {message} ({statusCode})
          </p>
        }
        actions={
          <EuiButton onClick={updatePolicies} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.policiesReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else if (policies.length === 0) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
              defaultMessage="Create your first index lifecycle policy"
            />
          </h2>
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
        actions={isReadOnly ? undefined : createPolicyButton}
      />
    );
  } else {
    body = (
      <>
        <ListActionHandler
          deletePolicyCallback={() => {
            // if a flyout was open, then close it
            history.push(getPoliciesListPath());
            // update the policies in the list after 1 was deleted
            updatePolicies();
          }}
        />
        <PolicyTable policies={policies} />
        {flyoutPolicy && <ViewPolicyFlyout policy={flyoutPolicy} />}
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={policyListTitle}
        description={policyListDescription}
        menu={menu}
        docLink={docLinks.links.elasticsearch.ilm}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      {body}
    </>
  );
};
