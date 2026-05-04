/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface DotProps {
  color: string;
}

const Dot: React.FC<DotProps> = ({ color }) => (
  <span
    css={css`
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${color};
      margin-right: 4px;
      vertical-align: middle;
    `}
  />
);

interface LineProps {
  color: string;
  strokeWidth: number;
}

const Line: React.FC<LineProps> = ({ color, strokeWidth }) => (
  <span
    css={css`
      display: inline-block;
      width: 20px;
      height: ${strokeWidth}px;
      background-color: ${color};
      margin-right: 4px;
      vertical-align: middle;
    `}
  />
);

export const Legend: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="l"
      alignItems="center"
      wrap
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-top: 1px solid ${euiTheme.colors.lightShade};
      `}
    >
      {/* Lane section */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.streams.ingestFlow.legend.lanesLabel', {
              defaultMessage: 'Lanes:',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.vis.euiColorVis0} />
          {i18n.translate('xpack.streams.ingestFlow.legend.fleetAgentsLane', {
            defaultMessage: 'Fleet Agents',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.vis.euiColorVis1} />
          {i18n.translate('xpack.streams.ingestFlow.legend.agentlessLane', {
            defaultMessage: 'Agentless',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.vis.euiColorVis2} />
          {i18n.translate('xpack.streams.ingestFlow.legend.prometheusLane', {
            defaultMessage: 'Prometheus',
          })}
        </EuiText>
      </EuiFlexItem>

      {/* Divider */}
      <EuiFlexItem grow={false}>
        <span
          css={css`
            width: 1px;
            height: 16px;
            background: ${euiTheme.colors.lightShade};
          `}
        />
      </EuiFlexItem>

      {/* Edge thickness key */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.streams.ingestFlow.legend.throughputLabel', {
              defaultMessage: 'Throughput:',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Line color={euiTheme.colors.subduedText} strokeWidth={1} />
          {i18n.translate('xpack.streams.ingestFlow.legend.lowThroughput', {
            defaultMessage: 'Low',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Line color={euiTheme.colors.subduedText} strokeWidth={4} />
          {i18n.translate('xpack.streams.ingestFlow.legend.highThroughput', {
            defaultMessage: 'High',
          })}
        </EuiText>
      </EuiFlexItem>

      {/* Divider */}
      <EuiFlexItem grow={false}>
        <span
          css={css`
            width: 1px;
            height: 16px;
            background: ${euiTheme.colors.lightShade};
          `}
        />
      </EuiFlexItem>

      {/* Health key */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.streams.ingestFlow.legend.healthLabel', {
              defaultMessage: 'Health:',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.success} />
          {i18n.translate('xpack.streams.ingestFlow.legend.healthHealthy', {
            defaultMessage: 'Healthy',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.warning} />
          {i18n.translate('xpack.streams.ingestFlow.legend.healthDegraded', {
            defaultMessage: 'Degraded',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <Dot color={euiTheme.colors.danger} />
          {i18n.translate('xpack.streams.ingestFlow.legend.healthDown', {
            defaultMessage: 'Down',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
