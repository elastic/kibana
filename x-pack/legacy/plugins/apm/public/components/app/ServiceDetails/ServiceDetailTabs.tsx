/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiTabs, EuiSpacer } from '@elastic/eui';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceMetrics } from '../ServiceMetrics';
import { isRumAgentName, isJavaAgentName } from '../../../../common/agent_name';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { TransactionOverviewLink } from '../../shared/Links/apm/TransactionOverviewLink';
import { ErrorOverviewLink } from '../../shared/Links/apm/ErrorOverviewLink';
import { MetricOverviewLink } from '../../shared/Links/apm/MetricOverviewLink';
import { ServiceNodeOverviewLink } from '../../shared/Links/apm/ServiceNodeOverviewLink';
import { ServiceNodeOverview } from '../ServiceNodeOverview';
import { useAgentName } from '../../../hooks/useAgentName';
import { ServiceMap } from '../ServiceMap';
import { ServiceMapLink } from '../../shared/Links/apm/ServiceMapLink';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface Props {
  tab: 'transactions' | 'errors' | 'metrics' | 'nodes' | 'service-map';
}

export function ServiceDetailTabs({ tab }: Props) {
  const { urlParams } = useUrlParams();
  const { serviceName } = urlParams;
  const { agentName } = useAgentName();
  const { serviceMapEnabled } = useApmPluginContext().config;

  if (!serviceName) {
    // this never happens, urlParams type is not accurate enough
    throw new Error('Service name was not defined');
  }

  const transactionsTab = {
    link: (
      <TransactionOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
          defaultMessage: 'Transactions'
        })}
      </TransactionOverviewLink>
    ),
    render: () => <TransactionOverview />,
    name: 'transactions'
  };

  const errorsTab = {
    link: (
      <ErrorOverviewLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
          defaultMessage: 'Errors'
        })}
      </ErrorOverviewLink>
    ),
    render: () => {
      return <ErrorGroupOverview />;
    },
    name: 'errors'
  };

  const tabs = [transactionsTab, errorsTab];

  if (isJavaAgentName(agentName)) {
    const nodesListTab = {
      link: (
        <ServiceNodeOverviewLink serviceName={serviceName}>
          {i18n.translate('xpack.apm.serviceDetails.nodesTabLabel', {
            defaultMessage: 'JVMs'
          })}
        </ServiceNodeOverviewLink>
      ),
      render: () => <ServiceNodeOverview />,
      name: 'nodes'
    };
    tabs.push(nodesListTab);
  } else if (agentName && !isRumAgentName(agentName)) {
    const metricsTab = {
      link: (
        <MetricOverviewLink serviceName={serviceName}>
          {i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
            defaultMessage: 'Metrics'
          })}
        </MetricOverviewLink>
      ),
      render: () => <ServiceMetrics agentName={agentName} />,
      name: 'metrics'
    };
    tabs.push(metricsTab);
  }

  const serviceMapTab = {
    link: (
      <ServiceMapLink serviceName={serviceName}>
        {i18n.translate('xpack.apm.home.serviceMapTabLabel', {
          defaultMessage: 'Service Map'
        })}
      </ServiceMapLink>
    ),
    render: () => <ServiceMap serviceName={serviceName} />,
    name: 'service-map'
  };

  if (serviceMapEnabled) {
    tabs.push(serviceMapTab);
  }

  const selectedTab = tabs.find(serviceTab => serviceTab.name === tab);

  return (
    <>
      <EuiTabs>
        {tabs.map(serviceTab => (
          <EuiTabLink
            isSelected={serviceTab.name === tab}
            key={serviceTab.name}
          >
            {serviceTab.link}
          </EuiTabLink>
        ))}
      </EuiTabs>
      <EuiSpacer />
      {selectedTab ? selectedTab.render() : null}
    </>
  );
}
