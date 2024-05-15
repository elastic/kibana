/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiTextColor,
} from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation';
import styled from '@emotion/styled';
import * as i18n from '../pages/translations';

const StyledEuiCard = styled(EuiCard)`
  span.euiTitle {
    max-width: 540px;
    display: block;
    margin: 0 auto;
  }
`;

export const EntityAnalyticsUpsellingSection = memo(
  ({
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

    const requiredProductOrLicense = requiredProduct ?? requiredLicense ?? '';
    const upgradeMessage = requiredProduct
      ? i18n.UPGRADE_PRODUCT_MESSAGE(requiredProduct)
      : i18n.UPGRADE_LICENSE_MESSAGE(requiredLicense ?? '');
    const { navigateTo } = useNavigation();

    const goToSubscription = useCallback(() => {
      navigateTo({ url: subscriptionUrl });
    }, [navigateTo, subscriptionUrl]);

    return (
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
    );
  }
);

EntityAnalyticsUpsellingSection.displayName = 'EntityAnalyticsUpsellingSection';
