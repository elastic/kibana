/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { useKibana } from '../../common/hooks/use_kibana';
import * as paywallI18n from './license_paywall_translations';

export const LicensePaywallCard = React.memo(() => {
  const { getUrlForApp } = useKibana().services.application;
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCard
        data-test-subj="LicensePaywallCard"
        betaBadgeProps={{
          label: paywallI18n.ENTERPRISE_LICENSE_LABEL,
        }}
        isDisabled={true}
        icon={<EuiIcon size="xl" type="lock" aria-hidden={true} />}
        title={
          <h3>
            <strong>{paywallI18n.ENTERPRISE_LICENSE_TITLE}</strong>
          </h3>
        }
        description={false}
      >
        <EuiFlexGroup className="lockedCardDescription" direction="column" justifyContent="center">
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiText>
              <h4>
                <EuiTextColor color="subdued">
                  {paywallI18n.ENTERPRISE_LICENSE_UPGRADE_TITLE}
                </EuiTextColor>
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>{paywallI18n.ENTERPRISE_LICENSE_UPGRADE_DESCRIPTION}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <EuiButton
                href={getUrlForApp('management', { path: 'stack/license_management' })}
                fill
              >
                {paywallI18n.ENTERPRISE_LICENSE_UPGRADE_BUTTON}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCard>
    </>
  );
});
LicensePaywallCard.displayName = 'LicensePaywallCard';
