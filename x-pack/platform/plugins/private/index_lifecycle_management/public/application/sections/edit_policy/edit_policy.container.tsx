/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiLoadingSpinner, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { MIN_SEARCHABLE_SNAPSHOT_LICENSE } from '../../../../common/constants';
import { useKibana, attemptToURIDecode } from '../../../shared_imports';

import { useLoadPoliciesList } from '../../services/api';
import { getPolicyByName } from '../../lib/policies';
import { defaultPolicy } from '../../constants';
import { getPoliciesListPath } from '../../services/navigation';

import { EditPolicy as PresentationComponent } from './edit_policy';
import { EditPolicyContextProvider } from './edit_policy_context';

interface RouterProps {
  policyName: string;
}

const policyListTitle = i18n.translate('xpack.indexLifecycleMgmt.policyTable.sectionHeading', {
  defaultMessage: 'Index Lifecycle Policies',
});

const createPolicyTitle = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.createPolicyMessage',
  {
    defaultMessage: 'Create policy',
  }
);

export const EditPolicy: React.FunctionComponent<RouteComponentProps<RouterProps>> = ({
  match: {
    params: { policyName },
  },
}) => {
  const {
    services: { breadcrumbService, license, docLinks, history },
  } = useKibana();
  const { error, isLoading, data: policies, resendRequest } = useLoadPoliciesList();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('editPolicy');
  }, [breadcrumbService]);

  const decodedPolicyName = attemptToURIDecode(policyName) ?? '';
  const existingPolicy = policies ? getPolicyByName(policies, decodedPolicyName) : undefined;
  const isNewPolicy = policies ? !existingPolicy?.policy : !decodedPolicyName;

  const title = isNewPolicy
    ? createPolicyTitle
    : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.editPolicyMessage', {
        defaultMessage: 'Edit policy {originalPolicyName}',
        values: { originalPolicyName: decodedPolicyName },
      });

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.policiesLoading"
            defaultMessage="Loading policies..."
          />
        }
      />
    );
  } else if (error || !policies) {
    const { statusCode, message } = error ? error : { statusCode: '', message: '' };
    body = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesLoadingFailedTitle"
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
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else {
    const isHotPhaseRequired = isNewPolicy ? true : Boolean(existingPolicy?.policy?.phases?.hot);

    body = (
      <EditPolicyContextProvider
        value={{
          isNewPolicy,
          isHotPhaseRequired,
          policyName: decodedPolicyName,
          policy: existingPolicy?.policy ?? defaultPolicy,
          existingPolicies: policies,
          license: {
            canUseSearchableSnapshot: () => license.hasAtLeast(MIN_SEARCHABLE_SNAPSHOT_LICENSE),
          },
          indices: existingPolicy && existingPolicy.indices ? existingPolicy.indices : [],
          indexTemplates:
            existingPolicy && existingPolicy.indexTemplates ? existingPolicy.indexTemplates : [],
        }}
      >
        <PresentationComponent />
      </EditPolicyContextProvider>
    );
  }

  return (
    <>
      <AppHeader
        title={title}
        back={{
          href: history.createHref({ pathname: getPoliciesListPath() }),
          label: policyListTitle,
        }}
        docLink={docLinks.links.elasticsearch.ilm}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {body}
    </>
  );
};
