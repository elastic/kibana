/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApmHeader } from '../../shared/ApmHeader';
import { HistoryTabs, IHistoryTab } from '../../shared/HistoryTabs';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { ServiceOverview } from '../ServiceOverview';
import { TraceOverview } from '../TraceOverview';
import { APMLink } from '../../shared/Links/APMLink';

const homeTabs: IHistoryTab[] = [
  {
    path: '/services',
    title: i18n.translate('xpack.apm.home.servicesTabLabel', {
      defaultMessage: 'Services'
    }),
    render: () => <ServiceOverview />,
    name: 'services'
  },
  {
    path: '/traces',
    title: i18n.translate('xpack.apm.home.tracesTabLabel', {
      defaultMessage: 'Traces'
    }),
    render: () => <TraceOverview />,
    name: 'traces'
  }
];

const SETTINGS_LINK_LABEL = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings'
});

export function Home() {
  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>APM</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <APMLink path="/settings">
              <EuiButtonEmpty size="s" color="primary" iconType="gear">
                {SETTINGS_LINK_LABEL}
              </EuiButtonEmpty>
            </APMLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SetupInstructionsLink />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      <HistoryTabs tabs={homeTabs} />
    </div>
  );
}
