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
import { useFetcher } from '../../../hooks/useFetcher';
import { isRumAgentName } from '../../../../common/agent_name';
import { callApmApi } from '../../../services/rest/callApmApi';
import { EuiTabLink } from '../../shared/EuiTabLink';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { TransactionOverviewLink } from '../../shared/Links/apm/TransactionOverviewLink';
import { ErrorOverviewLink } from '../../shared/Links/apm/ErrorOverviewLink';
import { MetricOverviewLink } from '../../shared/Links/apm/MetricOverviewLink';

interface Props {
  tab: 'transactions' | 'errors' | 'metrics';
}

export function ServiceDetailTabs({ tab }: Props) {
  const { urlParams } = useUrlParams();
  const { serviceName, start, end } = urlParams;
  const { data: agentName } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/agent_name',
        params: {
          path: { serviceName },
          query: { start, end }
        }
      }).then(res => res.agentName);
    }
  }, [serviceName, start, end]);

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
  if (agentName && !isRumAgentName(agentName)) {
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
