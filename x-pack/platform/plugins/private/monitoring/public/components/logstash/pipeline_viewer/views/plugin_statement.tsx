/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  UseEuiTheme,
  logicalCSS,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { formatMetric } from '../../../../lib/format_number';
import { Metric } from './metric';
import { Vertex } from './types';

const pluginStyle = ({ euiTheme }: UseEuiTheme) => css`
  ${logicalCSS('margin-left', euiTheme.size.xs)}
`;

const pluginStatementStyle = ({ euiTheme }: UseEuiTheme) => css`
  ${logicalCSS('padding-left', euiTheme.size.m)}
`;

function getInputStatementMetrics({ latestEventsPerSecond }: Vertex) {
  return [
    <Metric
      key="eventsEmitted"
      type="eventsEmitted"
      value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s emitted')}
    />,
  ];
}

function getProcessorStatementMetrics(processorVertex: Vertex) {
  const { latestMillisPerEvent, latestEventsPerSecond, percentOfTotalProcessorTime } =
    processorVertex;

  return [
    <Metric
      key="cpuMetric"
      type="cpuTime"
      warning={processorVertex.isTimeConsuming()}
      value={formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', {
        prependSpace: false,
      })}
    />,
    <Metric
      key="eventMillis"
      type="eventMillis"
      warning={processorVertex.isSlow()}
      value={formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')}
    />,
    <Metric
      key="eventsReceived"
      type="events"
      value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s received')}
    />,
  ];
}

function renderPluginStatementMetrics(pluginType: string, vertex: Vertex) {
  return pluginType === 'input'
    ? getInputStatementMetrics(vertex)
    : getProcessorStatementMetrics(vertex);
}

interface Statement {
  hasExplicitId: boolean;
  id: string;
  name: string;
  pluginType: string;
  vertex: Vertex;
}

interface PluginStatementProps {
  onShowVertexDetails: (vertex: Vertex) => void;
  statement: Statement;
}

export function PluginStatement({
  statement: { hasExplicitId, id, name, pluginType, vertex },
  onShowVertexDetails,
}: PluginStatementProps) {
  const statementMetrics = renderPluginStatementMetrics(pluginType, vertex);

  const onNameButtonClick = () => {
    onShowVertexDetails(vertex);
  };

  return (
    <EuiFlexGroup
      alignItems="center"
      css={pluginStatementStyle}
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`pluginStatement-${pluginType}-${name}-EmptyButton`}
              aria-label={name}
              color="primary"
              css={pluginStyle}
              flush="left"
              iconType="dot"
              onClick={onNameButtonClick}
              size="xs"
            >
              <span>{name}</span>
            </EuiButtonEmpty>
          </EuiFlexItem>
          {hasExplicitId && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                data-test-subj={`pluginStatement-${pluginType}-${name}-Badge`}
                onClick={onNameButtonClick}
                onClickAriaLabel={i18n.translate(
                  'xpack.monitoring.logstash.pipelineStatement.viewDetailsAriaLabel',
                  { defaultMessage: 'View details' }
                )}
              >
                {id}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {statementMetrics && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">{statementMetrics}</EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
