/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import styled from '@emotion/styled';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import * as i18n from './translations';
import paywallPng from '../images/entity_paywall.png';
import { EntityAnalyticsUpsellingSection } from '../sections/entity_analytics';

const PaywallDiv = styled.div`
  max-width: 75%;
  margin: 0 auto;
  .euiCard__betaBadgeWrapper {
    .euiCard__betaBadge {
      width: auto;
    }
  }
  .paywallCardDescription {
    padding: 0 15%;
  }
`;

const EntityAnalyticsUpsellingComponent = ({
  requiredLicense,
  requiredProduct,
  subscriptionUrl,
}: {
  requiredLicense?: string;
  requiredProduct?: string;
  subscriptionUrl?: string;
}) => {
  if (!requiredProduct && !requiredLicense) {
    throw new Error('requiredProduct or requiredLicense must be defined');
  }

  const upgradeMessage = requiredProduct
    ? i18n.UPGRADE_PRODUCT_MESSAGE(requiredProduct)
    : i18n.UPGRADE_LICENSE_MESSAGE(requiredLicense ?? '');

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={i18n.ENTITY_ANALYTICS_TITLE} />
        <EuiSpacer size="xl" />
        <PaywallDiv>
          <EntityAnalyticsUpsellingSection
            requiredLicense={requiredLicense}
            requiredProduct={requiredProduct}
            subscriptionUrl={subscriptionUrl}
          />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiImage alt={upgradeMessage} src={paywallPng} size="fullWidth" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </PaywallDiv>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

EntityAnalyticsUpsellingComponent.displayName = 'EntityAnalyticsUpsellingComponent';

// eslint-disable-next-line import/no-default-export
export default React.memo(EntityAnalyticsUpsellingComponent);
