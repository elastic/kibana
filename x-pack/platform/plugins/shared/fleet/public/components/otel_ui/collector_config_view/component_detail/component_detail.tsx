/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type {
  OTelCollectorConfig,
  OTelCollectorComponentID,
  ComponentHealth,
} from '../../../../../common/types';

import type { OTelComponentType } from '../constants';
import { COMPONENT_TYPE_LABELS } from '../constants';
import {
  findComponentHealth,
  getComponentHealthStatus,
  getHealthStatusColor,
  getHealthStatusLabel,
} from '../utils';

import { ComponentConfigTab } from './component_config_tab';
import { ComponentHealthTab } from './component_health_tab';
import { ComponentMetricsTab, SUPPORTED_METRIC_TYPES } from './component_metrics_tab';

const getComponentSection = (
  config: OTelCollectorConfig,
  componentType: OTelComponentType
): Record<OTelCollectorComponentID, unknown> | undefined => {
  switch (componentType) {
    case 'receiver':
      return config.receivers;
    case 'processor':
      return config.processors;
    case 'connector':
      return config.connectors;
    case 'exporter':
      return config.exporters;
    case 'pipeline':
      return config.service?.pipelines as Record<string, unknown> | undefined;
  }
};

type ComponentDetailTabId = 'config' | 'health' | 'metrics';

const COMPONENT_DETAIL_TABS: Array<{ id: ComponentDetailTabId; name: string }> = [
  {
    id: 'health',
    name: i18n.translate('xpack.fleet.otelUi.componentDetail.tab.health', {
      defaultMessage: 'Health',
    }),
  },
  {
    id: 'metrics',
    name: i18n.translate('xpack.fleet.otelUi.componentDetail.tab.metrics', {
      defaultMessage: 'Metrics',
    }),
  },
  {
    id: 'config',
    name: i18n.translate('xpack.fleet.otelUi.componentDetail.tab.config', {
      defaultMessage: 'Config',
    }),
  },
];

interface OTelComponentDetailProps {
  componentId: string;
  componentType: OTelComponentType;
  pipelineId?: string;
  config: OTelCollectorConfig;
  health?: ComponentHealth;
  onClose: () => void;
}

export const OTelComponentDetail: React.FunctionComponent<OTelComponentDetailProps> = ({
  componentId,
  componentType,
  pipelineId,
  config,
  health,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTabId, setSelectedTabId] = useState<ComponentDetailTabId>('health');
  const visibleTabs = useMemo(
    () =>
      COMPONENT_DETAIL_TABS.filter(
        (tab) => tab.id !== 'metrics' || SUPPORTED_METRIC_TYPES.includes(componentType)
      ),
    [componentType]
  );
  const section = getComponentSection(config, componentType);
  const componentConfig = section?.[componentId];
  const componentHealth = useMemo(() => {
    if (pipelineId) {
      const pipelineHealth = findComponentHealth(health, 'pipeline', pipelineId);
      return (
        findComponentHealth(pipelineHealth, componentType, componentId) ??
        findComponentHealth(health, componentType, componentId)
      );
    }
    return findComponentHealth(health, componentType, componentId);
  }, [health, componentType, componentId, pipelineId]);

  const healthStatus = getComponentHealthStatus(componentHealth);
  const healhtLabel = (
    <EuiFlexItem grow={false}>
      <EuiHealth
        color={getHealthStatusColor(healthStatus, euiTheme)}
        data-test-subj="otelComponentHealthStatus"
      >
        {getHealthStatusLabel(healthStatus)}
      </EuiHealth>
    </EuiFlexItem>
  );

  return (
    <EuiPanel paddingSize="m" data-test-subj="otelComponentDetail">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>
                  {COMPONENT_TYPE_LABELS[componentType]}: {componentId}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            {componentHealth && healhtLabel}
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                aria-label={i18n.translate(
                  'xpack.fleet.otelUi.componentDetail.closeButtonAriaLabel',
                  {
                    defaultMessage: 'Close component detail',
                  }
                )}
                onClick={onClose}
                data-test-subj="otelComponentDetailCloseButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTabs size="s" data-test-subj="otelComponentDetailTabs">
        {visibleTabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
            data-test-subj={`otelComponentDetailTab-${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTabId === 'config' && (
        <ComponentConfigTab
          componentId={componentId}
          componentConfig={componentConfig}
          componentType={componentType}
        />
      )}
      {selectedTabId === 'health' && <ComponentHealthTab componentHealth={componentHealth} />}

      {selectedTabId === 'metrics' && (
        <ComponentMetricsTab componentId={componentId} componentType={componentType} />
      )}
    </EuiPanel>
  );
};
