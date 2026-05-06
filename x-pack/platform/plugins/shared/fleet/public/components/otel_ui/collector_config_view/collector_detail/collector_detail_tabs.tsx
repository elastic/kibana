/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { Agent, ComponentHealth, OTelCollectorConfig } from '../../../../../common/types';

import type { OTelComponentType } from '../graph_view/constants';
import { YamlViewer } from '../yaml_viewer';
import { OTelComponentDetail } from '../component_detail';

import { CollectorDetailHealth } from './collector_detail_health';
import { CollectorDetailInfo } from './collector_detail_info';

type DetailTabId = 'health' | 'info' | 'yaml';

const DETAIL_TABS: Array<{ id: DetailTabId; name: string }> = [
  {
    id: 'health',
    name: i18n.translate('xpack.fleet.collectorDetailTabs.health', {
      defaultMessage: 'Health',
    }),
  },
  {
    id: 'info',
    name: i18n.translate('xpack.fleet.collectorDetailTabs.info', {
      defaultMessage: 'Info',
    }),
  },
  {
    id: 'yaml',
    name: i18n.translate('xpack.fleet.collectorDetailTabs.yaml', {
      defaultMessage: 'Configuration',
    }),
  },
];

interface ComponentSelection {
  componentId: string;
  componentType: OTelComponentType;
}

interface CollectorDetailTabsProps {
  agent: Agent;
  config: OTelCollectorConfig;
  health?: ComponentHealth;
  isConfigLoading?: boolean;
}

export const CollectorDetailTabs: React.FC<CollectorDetailTabsProps> = ({
  agent,
  config,
  health,
  isConfigLoading,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<DetailTabId>('health');
  const [selectedComponent, setSelectedComponent] = useState<ComponentSelection | null>(null);

  const handleComponentClick = (componentId: string, componentType: OTelComponentType) => {
    if (
      selectedComponent?.componentId === componentId &&
      selectedComponent?.componentType === componentType
    ) {
      setSelectedComponent(null);
    } else {
      setSelectedComponent({ componentId, componentType });
    }
  };

  const agentName =
    typeof agent.local_metadata?.host === 'object' &&
    typeof agent.local_metadata.host.hostname === 'string'
      ? agent.local_metadata.host.hostname
      : agent.id;

  return (
    <>
      <EuiTabs size="s" data-test-subj="collectorDetailTabs">
        {DETAIL_TABS.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => {
              setSelectedTabId(tab.id);
              setSelectedComponent(null);
            }}
            data-test-subj={`collectorDetailTab-${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          {selectedTabId === 'health' && (
            <CollectorDetailHealth
              health={health}
              config={config}
              onComponentClick={handleComponentClick}
              selectedComponentId={selectedComponent?.componentId}
            />
          )}
          {selectedTabId === 'info' && <CollectorDetailInfo agent={agent} />}
          {selectedTabId === 'yaml' &&
            (isConfigLoading ? (
              <EuiLoadingSpinner />
            ) : (
              <YamlViewer config={config} agentName={agentName} />
            ))}
        </EuiFlexItem>
        {selectedComponent && selectedTabId === 'health' && (
          <EuiFlexItem>
            <OTelComponentDetail
              componentId={selectedComponent.componentId}
              componentType={selectedComponent.componentType}
              config={config}
              health={health}
              onClose={() => setSelectedComponent(null)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
