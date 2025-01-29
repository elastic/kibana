/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { AuthorizationWrapper } from '../../../common/components/authorization';
import { AvailabilityWrapper } from '../../../common/components/availability_wrapper';
import { IntegrationImageHeader } from '../../../common/components/integration_image_header';
import { ButtonsFooter } from '../../../common/components/buttons_footer';
import { SectionWrapper } from '../../../common/components/section_wrapper';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import { AutomaticImportCard } from './automatic_import_card';
import * as i18n from './translations';

export const CreateIntegrationLanding = React.memo(() => {
  const navigate = useNavigate();
  return (
    <KibanaPageTemplate>
      <IntegrationImageHeader />
      <KibanaPageTemplate.Section grow>
        <SectionWrapper title={i18n.LANDING_TITLE} subtitle={i18n.LANDING_DESCRIPTION}>
          <AvailabilityWrapper>
            <AuthorizationWrapper canCreateIntegrations>
              <EuiFlexGroup
                direction="column"
                gutterSize="l"
                alignItems="center"
                justifyContent="flexStart"
              >
                <EuiFlexItem>
                  <EuiSpacer size="l" />
                  <AutomaticImportCard />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="flexStart"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="package" size="l" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        <FormattedMessage
                          id="xpack.automaticImport.createIntegrationLanding.uploadPackageDescription"
                          defaultMessage="If you have an existing integration package, {link}"
                          values={{
                            link: (
                              <EuiLink
                                onClick={() => navigate(Page.upload)}
                                data-test-subj="uploadPackageLink"
                              >
                                <FormattedMessage
                                  id="xpack.automaticImport.createIntegrationLanding.uploadPackageLink"
                                  defaultMessage="upload it as a .zip"
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </AuthorizationWrapper>
          </AvailabilityWrapper>
        </SectionWrapper>
      </KibanaPageTemplate.Section>
      <ButtonsFooter />
    </KibanaPageTemplate>
  );
});
CreateIntegrationLanding.displayName = 'CreateIntegrationLanding';
