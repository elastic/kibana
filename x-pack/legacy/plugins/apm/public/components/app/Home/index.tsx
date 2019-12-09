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
  EuiTabs,
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { $ElementType } from 'utility-types';
import { ApmHeader } from '../../shared/ApmHeader';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { ServiceOverview } from '../ServiceOverview';
import { TraceOverview } from '../TraceOverview';
import { ServiceOverviewLink } from '../../shared/Links/apm/ServiceOverviewLink';
import { TraceOverviewLink } from '../../shared/Links/apm/TraceOverviewLink';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { SettingsLink } from '../../shared/Links/apm/SettingsLink';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { ServiceMap } from '../ServiceMap';
import { usePlugins } from '../../../new-platform/plugin';

function getHomeTabs({
  serviceMapEnabled = false
}: {
  serviceMapEnabled: boolean;
}) {
  const homeTabs = [
    {
      link: (
        <ServiceOverviewLink>
          {i18n.translate('xpack.apm.home.servicesTabLabel', {
            defaultMessage: 'Services'
          })}
        </ServiceOverviewLink>
      ),
      render: () => <ServiceOverview />,
      name: 'services'
    },
    {
      link: (
        <TraceOverviewLink>
          {i18n.translate('xpack.apm.home.tracesTabLabel', {
            defaultMessage: 'Traces'
          })}
        </TraceOverviewLink>
      ),
      render: () => <TraceOverview />,
      name: 'traces'
    }
  ];

  if (serviceMapEnabled) {
    homeTabs.push({
      link: (
        <ServiceMapLink>
          {i18n.translate('xpack.apm.home.serviceMapTabLabel', {
            defaultMessage: 'Service Map'
          })}
        </ServiceMapLink>
      ),
      render: () => <ServiceMap />,
      name: 'service-map'
    });
  }

  return homeTabs;
}
const SETTINGS_LINK_LABEL = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings'
});

interface Props {
  tab: 'traces' | 'services' | 'service-map';
}

export function Home({ tab }: Props) {
  const { apm } = usePlugins();
  const { serviceMapEnabled } = apm.config;
  const homeTabs = getHomeTabs({ serviceMapEnabled });
  const selectedTab = homeTabs.find(
    homeTab => homeTab.name === tab
  ) as $ElementType<typeof homeTabs, number>;

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
            <SettingsLink>
              <EuiButtonEmpty size="s" color="primary" iconType="gear">
                {SETTINGS_LINK_LABEL}
              </EuiButtonEmpty>
            </SettingsLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SetupInstructionsLink />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      <EuiTabs>
        {homeTabs.map(homeTab => (
          <EuiTabLink isSelected={homeTab === selectedTab} key={homeTab.name}>
            {homeTab.link}
          </EuiTabLink>
        ))}
      </EuiTabs>
      <EuiSpacer />
      {selectedTab.render()}
    </div>
  );
}
