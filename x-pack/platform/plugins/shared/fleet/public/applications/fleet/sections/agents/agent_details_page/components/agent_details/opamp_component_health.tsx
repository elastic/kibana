/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiTreeView,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { capitalize } from 'lodash';

import type { ComponentHealth } from '../../../../../types';

const getHealthColor = (health: ComponentHealth) => {
  if (health.healthy) {
    return 'success' as const;
  }

  const normalizedStatus = health.status?.toLowerCase() ?? '';
  if (normalizedStatus.includes('degraded') || normalizedStatus.includes('warning')) {
    return 'warning' as const;
  }

  return 'danger' as const;
};

const getStatusLabel = (health: ComponentHealth) => {
  if (health.healthy) {
    return '';
  }

  return (
    health.status ||
    i18n.translate('xpack.fleet.agentDetails.componentHealthStatusUnknown', {
      defaultMessage: 'Unknown',
    })
  );
};

const getOverallStatusLabel = (health: ComponentHealth) => {
  if (health.healthy) {
    return i18n.translate('xpack.fleet.agentDetails.componentHealthStatusHealthy', {
      defaultMessage: 'Healthy',
    });
  }

  return getStatusLabel(health);
};

const getComponentLabel = (componentName: string) => {
  const [componentType, name] = componentName.split(':');
  const componentTypeLabel = capitalize(componentType);
  return name ? `${componentTypeLabel}: ${name}` : componentTypeLabel;
};

const buildTreeItems = (
  healthMap: ComponentHealth['component_health_map'],
  parentId: string
): Array<{
  id: string;
  label: React.ReactNode;
  children?: Array<{ id: string; label: React.ReactNode; children?: unknown }>;
  isExpanded?: boolean;
}> => {
  return Object.entries(healthMap ?? {}).map(([name, health]) => {
    const id = `${parentId}.${name}`;
    const label = (
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiHealth color={getHealthColor(health)} />
            </EuiFlexItem>
            <EuiFlexItem>{getComponentLabel(name)}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {!health.healthy && (health.status || health.last_error) && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <EuiTextColor color="danger">
                {getStatusLabel(health)}: {health.last_error}
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );

    const children = Object.keys(health.component_health_map ?? {}).length
      ? buildTreeItems(health.component_health_map, id)
      : undefined;

    return {
      id,
      label,
      children,
      isExpanded: true,
    };
  });
};

export const OpAMPComponentHealth: React.FunctionComponent<{
  health?: ComponentHealth;
}> = memo(({ health }) => {
  const componentEntries = useMemo(
    () => Object.entries(health?.component_health_map ?? {}),
    [health?.component_health_map]
  );

  if (!componentEntries.length) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {health && (
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate('xpack.fleet.agentDetails.componentHealthOverallLabel', {
                          defaultMessage: 'Collector status: ',
                        })}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={getHealthColor(health)}>
                      {getOverallStatusLabel(health)}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {!health.healthy && health.last_error && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <EuiTextColor color="danger">{health.last_error}</EuiTextColor>
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}
      {componentEntries.map(([componentName, componentHealth]) => {
        const treeItems: any = Object.keys(componentHealth.component_health_map ?? {}).length
          ? buildTreeItems(componentHealth.component_health_map, componentName)
          : [];

        return (
          <EuiFlexItem grow={false} key={componentName}>
            <EuiPanel paddingSize="m">
              <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiHealth color={getHealthColor(componentHealth)} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{getComponentLabel(componentName)}</strong>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {!componentHealth.healthy &&
                  (componentHealth.status || componentHealth.last_error) && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <EuiTextColor color="danger">
                          {getStatusLabel(componentHealth)}: {componentHealth.last_error}
                        </EuiTextColor>
                      </EuiText>
                    </EuiFlexItem>
                  )}
                {treeItems.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiAccordion
                      id={`componentHealth-${componentName}`}
                      buttonContent={i18n.translate(
                        'xpack.fleet.agentDetails.componentHealthAccordionLabel',
                        {
                          defaultMessage: 'Components',
                        }
                      )}
                    >
                      <EuiTreeView
                        items={treeItems}
                        aria-label={i18n.translate(
                          'xpack.fleet.agentDetails.componentHealthTreeAriaLabel',
                          {
                            defaultMessage: 'Component health details',
                          }
                        )}
                        showExpansionArrows
                      />
                    </EuiAccordion>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
});
