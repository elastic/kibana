/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import { FiltersGlobal } from '../../../components/filters_global';
import { HeaderPage } from '../../../components/header_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import { DetectionEngineKql } from '../kql';
import * as i18n from './translations';

export const RuleDetailsComponent = React.memo(() => {
  return (
    <>
      <StickyContainer>
        <FiltersGlobal>
          <DetectionEngineKql />
        </FiltersGlobal>

        <HeaderPage
          backLink="#detection-engine/rules"
          backText="Back to rules"
          subtitle="Last signal: 23 minutes ago"
          title="Automated exfiltration"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiSwitch label="Activate rule" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                href="#detection-engine/rules/rule-details/edit-rule"
                iconType="visControls"
              >
                {'Edit rule settings'}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonIcon iconType="boxesVertical" aria-label="Additional actions" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>
      </StickyContainer>

      <SpyRoute />
    </>
  );
});
RuleDetailsComponent.displayName = 'RuleDetailsComponent';
