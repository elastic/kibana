/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';

import type { ComponentHealth, OTelCollectorConfig } from '../../../../../common/types';

import type { OTelComponentType } from '../graph_view/constants';
import { COMPONENT_TYPE_LABELS, COMPONENT_TYPE_VIS_COLORS } from '../graph_view/constants';
import { findComponentHealth } from '../graph_view/enrich_nodes_with_health';
import {
  getComponentHealthStatus,
  getHealthStatusLabel,
  HEALTH_STATUS_COLORS,
  type ComponentHealthStatus,
} from '../utils';

interface CollectorDetailHealthProps {
  health?: ComponentHealth;
  config?: OTelCollectorConfig;
  onComponentClick?: (componentId: string, componentType: OTelComponentType) => void;
  selectedComponentId?: string;
}

const FormattedTimestamp: React.FC<{ nanos: number }> = ({ nanos }) => {
  const ms = nanos / 1_000_000;
  return (
    <EuiToolTip
      content={
        <FormattedDate
          value={ms}
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
        <FormattedRelative value={ms} />
      </span>
    </EuiToolTip>
  );
};

const COMPONENT_TYPE_ORDER: OTelComponentType[] = [
  'receiver',
  'connector',
  'processor',
  'exporter',
];

interface PipelineComponentGroup {
  type: OTelComponentType;
  components: Array<{
    id: string;
    health?: ComponentHealth;
    status: ComponentHealthStatus;
  }>;
}

const ComponentItem: React.FC<{
  id: string;
  type: OTelComponentType;
  status: ComponentHealthStatus;
  lastError?: string;
  isSelected: boolean;
  onClick?: () => void;
}> = ({ id, type, status, lastError, isSelected, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const accentColor =
    euiTheme.colors.vis[COMPONENT_TYPE_VIS_COLORS[type]] ?? euiTheme.colors.mediumShade;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      style={{
        display: 'inline-block',
        background: transparentize(accentColor, 0.9),
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: euiTheme.border.radius.small,
        padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
        marginBottom: euiTheme.size.xs,
        cursor: 'pointer',
        outline: isSelected ? `2px solid ${euiTheme.colors.primary}` : 'none',
        outlineOffset: -1,
      }}
      data-test-subj={`collectorHealthComponent-${type}:${id}`}
    >
      <EuiHealth color={HEALTH_STATUS_COLORS[status]}>
        <EuiText size="xs" style={{ fontWeight: isSelected ? 600 : 400 }}>
          {id}
        </EuiText>
      </EuiHealth>
      {lastError && (
        <EuiText size="xs" style={{ paddingLeft: 16, marginTop: 2 }}>
          <EuiTextColor color="danger">{lastError}</EuiTextColor>
        </EuiText>
      )}
    </div>
  );
};

const PipelineAccordion: React.FC<{
  pipelineId: string;
  groups: PipelineComponentGroup[];
  health?: ComponentHealth;
  onComponentClick?: (componentId: string, componentType: OTelComponentType) => void;
  selectedComponentId?: string;
}> = ({ pipelineId, groups, health, onComponentClick, selectedComponentId }) => {
  const accordionId = useGeneratedHtmlId({ prefix: `pipeline-${pipelineId}` });

  const totalComponents = groups.reduce((sum, g) => sum + g.components.length, 0);
  const healthyCount = groups.reduce(
    (sum, g) => sum + g.components.filter((c) => c.status === 'healthy').length,
    0
  );

  const pipelineHealth = findComponentHealth(health, 'pipeline', pipelineId);
  const pipelineStatus = getComponentHealthStatus(pipelineHealth);

  return (
    <EuiAccordion
      id={accordionId}
      onToggle={(isOpen) => {
        if (isOpen && onComponentClick) {
          onComponentClick(pipelineId, 'pipeline');
        }
      }}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={HEALTH_STATUS_COLORS[pipelineStatus]}>
              <strong>{pipelineId}</strong>
            </EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.fleet.collectorDetail.health.componentCount', {
                defaultMessage: '{count} {count, plural, one {component} other {components}}',
                values: { count: totalComponents },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={healthyCount === totalComponents ? 'success' : 'warning'}>
              {i18n.translate('xpack.fleet.collectorDetail.health.healthyCount', {
                defaultMessage: '{count} healthy',
                values: { count: healthyCount },
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="m"
      data-test-subj={`collectorHealthPipeline-${pipelineId}`}
    >
      {groups.map((group) => (
        <React.Fragment key={group.type}>
          <EuiTitle size="xxxs">
            <h5>{COMPONENT_TYPE_LABELS[group.type]}s</h5>
          </EuiTitle>
          <EuiSpacer size="xs" />
          {group.components.map((comp) => (
            <ComponentItem
              key={`${group.type}:${comp.id}`}
              id={comp.id}
              type={group.type}
              status={comp.status}
              lastError={comp.health?.last_error}
              isSelected={selectedComponentId === comp.id}
              onClick={
                onComponentClick
                  ? () => onComponentClick(comp.id, group.type)
                  : undefined
              }
            />
          ))}
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </EuiAccordion>
  );
};

export const CollectorDetailHealth: React.FC<CollectorDetailHealthProps> = ({
  health,
  config,
  onComponentClick,
  selectedComponentId,
}) => {
  const pipelineGroups = useMemo(() => {
    const pipelines = config?.service?.pipelines;
    if (!pipelines) return [];

    return Object.entries(pipelines).map(([pipelineId, pipeline]) => {
      const groups: PipelineComponentGroup[] = [];

      for (const type of COMPONENT_TYPE_ORDER) {
        const componentIds =
          type === 'receiver'
            ? pipeline.receivers
            : type === 'processor'
            ? pipeline.processors
            : type === 'exporter'
            ? pipeline.exporters
            : undefined;

        if (componentIds && componentIds.length > 0) {
          groups.push({
            type,
            components: componentIds.map((id) => {
              const componentHealth = findComponentHealth(health, type, id);
              return {
                id,
                health: componentHealth,
                status: getComponentHealthStatus(componentHealth),
              };
            }),
          });
        }
      }

      return { pipelineId, groups };
    });
  }, [config, health]);

  if (!health) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="collectorDetailHealthNoData">
        {i18n.translate('xpack.fleet.otelUi.collectorDetail.health.noData', {
          defaultMessage: 'No health data available',
        })}
      </EuiText>
    );
  }

  const overallStatus = getComponentHealthStatus(health);

  return (
    <>
      <EuiDescriptionList
        compressed
        type="column"
        data-test-subj="collectorDetailHealth"
        listItems={[
          {
            title: i18n.translate('xpack.fleet.otelUi.collectorDetail.health.statusLabel', {
              defaultMessage: 'Status',
            }),
            description: (
              <EuiBadge color={HEALTH_STATUS_COLORS[overallStatus]}>
                {getHealthStatusLabel(overallStatus)}
              </EuiBadge>
            ),
          },
          {
            title: i18n.translate(
              'xpack.fleet.otelUi.collectorDetail.health.reportedStatusLabel',
              { defaultMessage: 'Reported status' }
            ),
            description: health.status || '-',
          },
          {
            title: i18n.translate('xpack.fleet.otelUi.collectorDetail.health.lastUpdatedLabel', {
              defaultMessage: 'Last updated',
            }),
            description: health.status_time_unix_nano ? (
              <FormattedTimestamp nanos={health.status_time_unix_nano} />
            ) : (
              '-'
            ),
          },
          ...(health.last_error
            ? [
                {
                  title: i18n.translate(
                    'xpack.fleet.otelUi.collectorDetail.health.lastErrorLabel',
                    { defaultMessage: 'Last error' }
                  ),
                  description: (
                    <EuiTextColor color="danger">{health.last_error}</EuiTextColor>
                  ),
                },
              ]
            : []),
        ]}
      />

      {pipelineGroups.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate(
                    'xpack.fleet.collectorDetail.health.componentHealthTitle',
                    { defaultMessage: 'Component Health' }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="s">
            {pipelineGroups.map(({ pipelineId, groups }) => (
              <EuiFlexItem key={pipelineId} grow={false}>
                <PipelineAccordion
                  pipelineId={pipelineId}
                  groups={groups}
                  health={health}
                  onComponentClick={onComponentClick}
                  selectedComponentId={selectedComponentId}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
