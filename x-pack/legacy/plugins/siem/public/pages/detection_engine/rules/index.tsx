/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTabbedContent } from '@elastic/eui';
import React from 'react';

import { HeaderPage } from '../../../components/header_page';

import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';
import { AllRules } from './all_rules';
import { ActivityMonitor } from './activity_monitor';

export const RulesComponent = React.memo(() => {
  return (
    <>
      <WrapperPage>
        <HeaderPage
          backOptions={{ href: '#detection-engine', text: 'Back to detection engine' }}
          subtitle="Last completed run: 23 minutes ago"
          title={i18n.PAGE_TITLE}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiButton href="#" iconType="importAction">
                {'Import rule…'}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton fill href="#/detection-engine/rules/create-rule" iconType="plusInCircle">
                {'Add new rule'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>

        <EuiTabbedContent
          tabs={[
            {
              id: 'tabAllRules',
              name: 'All rules',
              content: <AllRules />,
            },
            {
              id: 'tabActivityMonitor',
              name: 'Activity monitor',
              content: <ActivityMonitor />,
            },
          ]}
        />
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
RulesComponent.displayName = 'RulesComponent';
