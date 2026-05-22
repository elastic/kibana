/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Agent } from '../../../../../common/types';

import { CollectorDetailHealth } from './collector_detail_health';
import { CollectorDetailLogs } from './collector_detail_logs';
import { CollectorDetailInfo } from './collector_detail_info';

type CollectorDetailTabId = 'health' | 'logs' | 'info';

const COLLECTOR_DETAIL_TABS: Array<{ id: CollectorDetailTabId; name: string }> = [
  {
    id: 'health',
    name: i18n.translate('xpack.fleet.otelUi.collectorDetail.tab.health', {
      defaultMessage: 'Health',
    }),
  },
  {
    id: 'logs',
    name: i18n.translate('xpack.fleet.otelUi.collectorDetail.tab.logs', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: 'info',
    name: i18n.translate('xpack.fleet.otelUi.collectorDetail.tab.info', {
      defaultMessage: 'Info',
    }),
  },
];

const getCollectorLabel = (agent: Agent): string => {
  const displayName = agent.non_identifying_attributes?.['elastic.display.name'];
  if (typeof displayName === 'string' && displayName) return displayName;
  const hostname =
    typeof agent.local_metadata?.host === 'object' ? agent.local_metadata.host.hostname : undefined;
  if (typeof hostname === 'string' && hostname) return hostname;
  return agent.id;
};

interface CollectorDetailProps {
  agents: Agent[];
}

export const CollectorDetail: React.FC<CollectorDetailProps> = ({ agents }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'collectorDetail' });
  const [selectedTabId, setSelectedTabId] = useState<CollectorDetailTabId>('health');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? '');

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const selectorOptions = useMemo(
    () => agents.map((a) => ({ value: a.id, text: getCollectorLabel(a) })),
    [agents]
  );

  const title =
    agents.length === 1
      ? i18n.translate('xpack.fleet.otelUi.collectorDetail.titleSingular', {
          defaultMessage: 'Collector',
        })
      : i18n.translate('xpack.fleet.otelUi.collectorDetail.titlePlural', {
          defaultMessage: 'Collectors ({count})',
          values: { count: agents.length },
        });

  if (!selectedAgent) return null;

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={title}
      initialIsOpen
      paddingSize="m"
      borders="all"
      data-test-subj="collectorDetail"
    >
      {agents.length > 1 && (
        <>
          <EuiSelect
            options={selectorOptions}
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            compressed
            data-test-subj="collectorDetailSelector"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiTabs size="s" data-test-subj="collectorDetailTabs">
        {COLLECTOR_DETAIL_TABS.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
            data-test-subj={`collectorDetailTab-${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTabId === 'health' && <CollectorDetailHealth health={selectedAgent.health} />}
      {selectedTabId === 'logs' && <CollectorDetailLogs agentId={selectedAgent.id} />}
      {selectedTabId === 'info' && <CollectorDetailInfo agent={selectedAgent} />}
    </EuiAccordion>
  );
};
