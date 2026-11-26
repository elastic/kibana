/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { IntegratedHomeHeader } from './components/integrated_home_header';
import { OnboardingWizardCards } from './components/onboarding_wizard_cards';
import { useHomeConfig, useHomeServices, useTelemetryId } from './context';

export const IntegratedHomePage = () => {
  const { docLinks } = useHomeServices();
  const { docsLink, solutionNav } = useHomeConfig();
  const getTelemetryId = useTelemetryId();

  return (
    <KibanaPageTemplate
      restrictWidth
      grow={false}
      solutionNav={solutionNav}
      data-test-subj="elasticsearchIntegratedHomePage"
    >
      <KibanaPageTemplate.Section paddingSize="xl" grow={false}>
        <IntegratedHomeHeader />

        <EuiSpacer size="xl" />
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.elasticsearchHome.integratedHome.moreWaysTitle', {
              defaultMessage: 'More ways to add data',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <OnboardingWizardCards />

        <EuiSpacer size="l" />
        <EuiFlexGroup gutterSize="l" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiLink
              href={docLinks.links.apiReference}
              target="_blank"
              external
              color="subdued"
              data-test-subj="elasticsearchHomeApiDocumentationLink"
              data-telemetry-id={getTelemetryId('apiDocumentationLink')}
            >
              {i18n.translate('xpack.elasticsearchHome.integratedHome.apiDocumentationLink', {
                defaultMessage: 'API documentation',
              })}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              href={docsLink.href}
              target="_blank"
              external
              color="subdued"
              data-test-subj="elasticsearchHomeDocumentationLink"
              data-telemetry-id={getTelemetryId('documentationLink')}
            >
              {docsLink.label}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
