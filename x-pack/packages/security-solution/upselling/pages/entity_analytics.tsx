/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiTextColor,
  EuiImage,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';

import styled from '@emotion/styled';
import { useNavigation } from '@kbn/security-solution-navigation';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import * as i18n from './translations';
import paywallPng from '../images/entity_paywall.png';

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
const StyledEuiCard = styled(EuiCard)`
  span.euiTitle {
    max-width: 540px;
    display: block;
    margin: 0 auto;
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
  const { navigateTo } = useNavigation();

  const goToSubscription = useCallback(() => {
    navigateTo({ url: subscriptionUrl });
  }, [navigateTo, subscriptionUrl]);

  if (!requiredProduct && !requiredLicense) {
    throw new Error('requiredProduct or requiredLicense must be defined');
  }

  const upgradeMessage = requiredProduct
    ? i18n.UPGRADE_PRODUCT_MESSAGE(requiredProduct)
    : i18n.UPGRADE_LICENSE_MESSAGE(requiredLicense ?? '');

  const requiredProductOrLicense = requiredProduct ?? requiredLicense ?? '';

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false} grow={true}>
      <KibanaPageTemplate.Section>
        <EuiPageHeader pageTitle={i18n.ENTITY_ANALYTICS_TITLE} />
        <EuiSpacer size="xl" />
        <PaywallDiv>
          <StyledEuiCard
            betaBadgeProps={{ label: requiredProductOrLicense }}
            icon={<EuiIcon size="xl" type="lock" />}
            display="subdued"
            title={
              <h3>
                <strong>{i18n.ENTITY_ANALYTICS_LICENSE_DESC}</strong>
              </h3>
            }
            description={false}
            paddingSize="xl"
          >
            <EuiFlexGroup
              data-test-subj="paywallCardDescription"
              className="paywallCardDescription"
              direction="column"
              gutterSize="none"
            >
              <EuiText>
                <EuiFlexItem>
                  <p>
                    <EuiTextColor color="subdued">{upgradeMessage}</EuiTextColor>
                  </p>
                </EuiFlexItem>
                <EuiFlexItem>
                  {subscriptionUrl && (
                    <div>
                      <EuiButton onClick={goToSubscription} fill>
                        {i18n.UPGRADE_BUTTON(requiredProductOrLicense)}
                      </EuiButton>
                    </div>
                  )}
                </EuiFlexItem>
              </EuiText>
            </EuiFlexGroup>
          </StyledEuiCard>
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
