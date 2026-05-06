/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { documentationService } from '../../services/documentation';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../services/breadcrumbs';
import { useAppContext } from '../../app_context';
import { PageHeader } from '../../components/page_header';

import { CreatePolicyWizard } from './create_policy_wizard';
import { CreatePolicyContextProvider } from './create_policy_context';

export const EnrichPolicyCreate: React.FunctionComponent<RouteComponentProps> = () => {
  const {
    core: { chrome },
  } = useAppContext();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.enrichPoliciesCreate);
    chrome.registerAppDocumentationLink(documentationService.getCreateEnrichPolicyLink());

    return () => {
      chrome.registerAppDocumentationLink('');
    };
  }, [chrome]);

  return (
    <CreatePolicyContextProvider>
      <PageHeader
        title={i18n.translate('xpack.idxMgmt.enrichPolicyCreate.appTitle', {
          defaultMessage: 'Create enrich policy',
        })}
        back="/app/management/data/index_management/enrich_policies"
        padding={{ bleed: 'l' }}
        fallback={{
          'data-test-subj': 'createEnrichPolicyHeaderContent',
          description: (
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.appDescription"
              defaultMessage="Specify how to retrieve and enrich your incoming data."
            />
          ),
          rightSideItems: [
            <EuiButtonEmpty
              href={documentationService.getCreateEnrichPolicyLink()}
              target="_blank"
              iconType="question"
              data-test-subj="createEnrichPolicyDocumentationLink"
            >
              <FormattedMessage
                id="xpack.idxMgmt.enrichPolicyCreate.titleDocsLinkText"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>,
          ],
        }}
      />
      <EuiSpacer size="l" />

      <CreatePolicyWizard />
    </CreatePolicyContextProvider>
  );
};
