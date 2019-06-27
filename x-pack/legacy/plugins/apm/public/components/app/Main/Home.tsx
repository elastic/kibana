/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiTab,
  EuiTabs,
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { ApmHeader } from '../../shared/ApmHeader';
import { HistoryTabs, IHistoryTab } from '../../shared/HistoryTabs';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { ServiceOverview } from '../ServiceOverview';
import { TraceOverview } from '../TraceOverview';
import { APMLink } from '../../shared/Links/APMLink';
import { units, px } from '../../../style/variables';

const homeTabs: IHistoryTab[] = [
  {
    path: '/services',
    name: i18n.translate('xpack.apm.home.servicesTabLabel', {
      defaultMessage: 'Services'
    }),
    render: () => <ServiceOverview />
  },
  {
    path: '/traces',
    name: i18n.translate('xpack.apm.home.tracesTabLabel', {
      defaultMessage: 'Traces'
    }),
    render: () => <TraceOverview />
  }
];

const SETTINGS_LINK_LABEL = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings'
});

// TODO: I'm sure there's a nicer way to do this

const MainNavigationBar = styled.div`
  display: block;
  height: 88px;
  padding: 0 ${theme.euiSizeL};
  background: ${theme.euiColorEmptyShade};
  border-bottom: 1px solid ${theme.euiColorLightShade};
  padding: ${px(units.plus)};
`;

export function Home() {
  return (
    <div>
      <MainNavigationBar>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {/* TODO: Tabs Nneeds to be hooked up with the appropiate routes */}
            <EuiTabs display="condensed">
              <EuiTab isSelected>Services</EuiTab>
              <EuiTab>Traces</EuiTab>
              <EuiTab>Settings</EuiTab>
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s">Setup instructions</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </MainNavigationBar>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              {/* TODO: Needs to change depending on the selected route (Service or Traces). Settings has its own page header. */}
              <h1>Services</h1>
            </EuiTitle>
          </EuiFlexItem>
          {/* TODO: Removing the below links as they're replaced by the above */}

          {/* <EuiFlexItem grow={false}>
            <APMLink path="/settings">
              <EuiButtonEmpty size="s" color="primary" iconType="gear">
                {SETTINGS_LINK_LABEL}
              </EuiButtonEmpty>
            </APMLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SetupInstructionsLink />
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </ApmHeader>
      {/* TODO: Replace the Services and Traces tabs with the main navigation bar above */}
      <HistoryTabs tabs={homeTabs} />
    </div>
  );
}
