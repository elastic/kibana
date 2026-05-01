/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { dump } from 'js-yaml';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type {
  OTelCollectorConfig,
  OTelCollectorComponentID,
  ComponentHealth,
} from '../../../../../common/types';

import type { OTelComponentType } from '../graph_view/constants';
import { COMPONENT_TYPE_LABELS } from '../graph_view/constants';

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
  }
};

const findComponentHealth = (
  health: ComponentHealth | undefined,
  componentType: OTelComponentType,
  componentId: string
): ComponentHealth | undefined => {
  const key = `${componentType}:${componentId}`;
  const map = health?.component_health_map;
  if (!map) {
    return undefined;
  }
  if (map[key]) {
    return map[key];
  }
  for (const entry of Object.values(map)) {
    const found = findComponentHealth(entry, componentType, componentId);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const getHealthStatusLabel = (componentHealth: ComponentHealth) => {
  if (componentHealth.healthy) {
    return i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusHealthy', {
      defaultMessage: 'Healthy',
    });
  }
  return i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusUnhealthy', {
    defaultMessage: 'Unhealthy',
  });
};

const getHealthColor = (componentHealth: ComponentHealth) => {
  if (componentHealth.healthy) {
    return 'success' as const;
  }
  const normalizedStatus = componentHealth.status?.toLowerCase() ?? '';
  if (normalizedStatus.includes('degraded') || normalizedStatus.includes('warning')) {
    return 'warning' as const;
  }
  return 'danger' as const;
};

type ComponentDetailTabId = 'config' | 'health' | 'metrics';

const COMPONENT_DETAIL_TABS: Array<{ id: ComponentDetailTabId; name: string }> = [
  {
    id: 'config',
    name: i18n.translate('xpack.fleet.otelUi.componentDetail.tab.config', {
      defaultMessage: 'Config',
    }),
  },
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
];

interface OTelComponentDetailProps {
  componentId: string;
  componentType: OTelComponentType;
  config: OTelCollectorConfig;
  health?: ComponentHealth;
  onClose: () => void;
}

export const OTelComponentDetail: React.FunctionComponent<OTelComponentDetailProps> = ({
  componentId,
  componentType,
  config,
  health,
  onClose,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<ComponentDetailTabId>('config');
  const section = getComponentSection(config, componentType);
  const componentConfig = section?.[componentId];
  const componentHealth = useMemo(
    () => findComponentHealth(health, componentType, componentId),
    [health, componentType, componentId]
  );

  const yamlContent = useMemo(() => {
    if (componentConfig == null) {
      return null;
    }
    return dump({ [componentId]: componentConfig }, { lineWidth: -1, quotingType: '"' });
  }, [componentId, componentConfig]);

  return (
    <EuiPanel paddingSize="m" data-test-subj="otelComponentDetail">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {COMPONENT_TYPE_LABELS[componentType]}: {componentId}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            aria-label={i18n.translate('xpack.fleet.otelUi.componentDetail.closeButtonAriaLabel', {
              defaultMessage: 'Close component detail',
            })}
            onClick={onClose}
            data-test-subj="otelComponentDetailCloseButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTabs size="s" data-test-subj="otelComponentDetailTabs">
        {COMPONENT_DETAIL_TABS.map((tab) => (
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
      {selectedTabId === 'config' &&
        (yamlContent ? (
          <EuiCodeBlock
            overflowHeight="390px"
            language="yaml"
            isCopyable
            fontSize="m"
            paddingSize="s"
          >
            {yamlContent}
          </EuiCodeBlock>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.fleet.otelUi.componentDetail.noConfiguration', {
              defaultMessage: 'No additional configuration',
            })}
          </EuiText>
        ))}
      {selectedTabId === 'health' &&
        (componentHealth ? (
          <EuiDescriptionList
            compressed
            type="column"
            data-test-subj="otelComponentDetailHealth"
            listItems={[
              {
                title: i18n.translate('xpack.fleet.otelUi.componentDetail.health.statusLabel', {
                  defaultMessage: 'Status',
                }),
                description: (
                  <EuiBadge color={getHealthColor(componentHealth)}>
                    {getHealthStatusLabel(componentHealth)}
                  </EuiBadge>
                ),
              },
              {
                title: i18n.translate(
                  'xpack.fleet.otelUi.componentDetail.health.reportedStatusLabel',
                  { defaultMessage: 'Reported status' }
                ),
                description: componentHealth.status || '-',
              },
              {
                title: i18n.translate(
                  'xpack.fleet.otelUi.componentDetail.health.lastUpdatedLabel',
                  { defaultMessage: 'Last updated' }
                ),
                description: componentHealth.status_time_unix_nano ? (
                  <EuiToolTip
                    content={
                      <FormattedDate
                        value={componentHealth.status_time_unix_nano / 1_000_000}
                        year="numeric"
                        month="short"
                        day="2-digit"
                        hour="numeric"
                        minute="numeric"
                        timeZoneName="short"
                      />
                    }
                  >
                    <span tabIndex={0}>
                      <FormattedRelative
                        value={componentHealth.status_time_unix_nano / 1_000_000}
                      />
                    </span>
                  </EuiToolTip>
                ) : (
                  '-'
                ),
              },
            ]}
          />
        ) : (
          <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailHealthNoData">
            {i18n.translate('xpack.fleet.otelUi.componentDetail.health.noData', {
              defaultMessage: 'No health data available',
            })}
          </EuiText>
        ))}
      {selectedTabId === 'metrics' && (
        <EuiText size="s" color="subdued" data-test-subj="otelComponentDetailMetricsPlaceholder">
          {i18n.translate('xpack.fleet.otelUi.componentDetail.metricsPlaceholder', {
            defaultMessage: 'Metrics will be available here.',
          })}
        </EuiText>
      )}
    </EuiPanel>
  );
};
