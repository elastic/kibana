/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { HistoryTabs } from '../../shared/HistoryTabs';
import { ErrorGroupOverview } from '../ErrorGroupOverview';
import { TransactionOverview } from '../TransactionOverview';
import { ServiceMetrics } from '../ServiceMetrics';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceAgentName } from '../../../services/rest/apm/services';
import { isRumAgentName } from '../../../../common/agent_name';

interface Props {
  urlParams: IUrlParams;
}

export function ServiceDetailTabs({ urlParams }: Props) {
  const { serviceName, start, end } = urlParams;
  const { data: agentName } = useFetcher(() => {
    if (serviceName && start && end) {
      return loadServiceAgentName({ serviceName, start, end });
    }
  }, [serviceName, start, end]);

  const transactionsTab = {
    title: i18n.translate('xpack.apm.serviceDetails.transactionsTabLabel', {
      defaultMessage: 'Transactions'
    }),
    path: `/services/${serviceName}/transactions`,
    render: () => <TransactionOverview urlParams={urlParams} />,
    name: 'transactions'
  };

  const errorsTab = {
    title: i18n.translate('xpack.apm.serviceDetails.errorsTabLabel', {
      defaultMessage: 'Errors'
    }),
    path: `/services/${serviceName}/errors`,
    render: () => {
      return <ErrorGroupOverview />;
    },
    name: 'errors'
  };

  const tabs = [transactionsTab, errorsTab];
  if (agentName && !isRumAgentName(agentName)) {
    const metricsTab = {
      title: i18n.translate('xpack.apm.serviceDetails.metricsTabLabel', {
        defaultMessage: 'Metrics'
      }),
      path: `/services/${serviceName}/metrics`,
      render: () => <ServiceMetrics agentName={agentName} />,
      name: 'metrics'
    };

    tabs.push(metricsTab);
  }

  return <HistoryTabs tabs={tabs} />;
}
