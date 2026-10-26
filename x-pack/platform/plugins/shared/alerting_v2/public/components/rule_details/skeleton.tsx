/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useAlertingLocators } from '../../application/locator_context';

export const Skeleton: React.FunctionComponent = () => {
  const { rulesLocators } = useAlertingLocators();
  const rulesListHref = rulesLocators.useUrl({});

  return (
    <>
      <AppHeaderLoading
        back={{
          href: rulesListHref,
          label: i18n.translate('xpack.alertingV2.ruleDetails.header.backToRulesLabel', {
            defaultMessage: 'Rules',
          }),
        }}
        spacing="bleed"
        sticky={false}
      />

      <EuiSpacer size="m" />

      <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
        <EuiSkeletonTitle size="s" />
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={4} />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
        <EuiSkeletonTitle size="s" />
        <EuiSpacer size="s" />
        <EuiPanel hasBorder paddingSize="none" css={{ width: '100%' }}>
          <EuiSkeletonText lines={8} />
        </EuiPanel>
      </EuiPanel>

      <EuiSpacer size="m" />
    </>
  );
};
