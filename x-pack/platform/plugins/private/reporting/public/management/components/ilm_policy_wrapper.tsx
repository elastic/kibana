/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { ClientConfigType, ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { Section } from '../../constants';

import { IlmPolicyLink } from './ilm_policy_link';
import { ReportDiagnostic } from './report_diagnostic';
import { useIlmPolicyStatus } from '../../lib/ilm_policy_status_context';
import { MigrateIlmPolicyCallOut } from './migrate_ilm_policy_callout';

export interface MatchParams {
  section: Section;
}

export interface ReportingTabsProps {
  config: ClientConfigType;
  apiClient: ReportingAPIClient;
}

export const IlmPolicyWrapper: React.FunctionComponent<
  Partial<RouteComponentProps> & ReportingTabsProps
> = (props) => {
  const { config, apiClient } = props;
  const {
    services: {
      application: { capabilities },
      share: { url: urlService },
      notifications,
    },
  } = useKibana();

  const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
  const ilmPolicyContextValue = useIlmPolicyStatus();
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexGroup justifyContent="flexEnd">
          {capabilities?.management?.data?.index_lifecycle_management && (
            <EuiFlexItem grow={false}>
              {ilmPolicyContextValue?.isLoading ? (
                <EuiLoadingSpinner />
              ) : (
                showIlmPolicyLink && <IlmPolicyLink locator={ilmLocator!} />
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <MigrateIlmPolicyCallOut toasts={notifications.toasts} />
        <EuiFlexItem grow={false}>
          <ReportDiagnostic clientConfig={config} apiClient={apiClient} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { IlmPolicyWrapper as default };
