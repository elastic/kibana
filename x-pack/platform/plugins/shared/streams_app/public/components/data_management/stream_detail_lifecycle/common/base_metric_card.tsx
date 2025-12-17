/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

interface ActionButton {
  iconType: string;
  ariaLabel: string;
  tooltip: string;
  onClick?: () => void;
  href?: string;
  'data-test-subj'?: string;
  disabled?: boolean;
}

interface Metrics {
  data: React.ReactNode;
  subtitle: string | string[] | React.ReactNode | null;
  'data-test-subj'?: string;
}

interface BaseMetricCardProps {
  title: React.ReactNode;
  actions?: ActionButton[] | React.ReactNode;
  metrics: Metrics[];
  'data-test-subj'?: string;
}

const EMPTY_LINE = '\u00A0';

export const BaseMetricCard: React.FC<BaseMetricCardProps> = ({
  title,
  actions,
  metrics,
  'data-test-subj': dataTestSubj,
}) => {
  const renderActionButtons = () => {
    if (!actions) return null;

    if (!Array.isArray(actions)) {
      return (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            {actions}
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    }

    if (actions.length === 0) return null;

    return (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          {actions.map((action, index) => (
            <EuiToolTip key={index} content={action.tooltip} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={action.iconType}
                size="xs"
                color="text"
                display="base"
                onClick={action.onClick}
                href={action.href}
                aria-label={action.ariaLabel}
                data-test-subj={action['data-test-subj']}
                isDisabled={action.disabled || false}
              />
            </EuiToolTip>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  const renderSingleMetric = (metric: Metrics) => {
    if (!metric) return null;

    return (
      <>
        <EuiText size="m">
          <h3 data-test-subj={metric['data-test-subj'] && `${metric['data-test-subj']}-metric`}>
            {metric.data}
          </h3>
        </EuiText>
        <EuiText
          size="s"
          color="subdued"
          data-test-subj={metric['data-test-subj'] && `${metric['data-test-subj']}-metric-subtitle`}
        >
          {metric.subtitle
            ? Array.isArray(metric.subtitle)
              ? metric.subtitle.join(' · ')
              : metric.subtitle
            : EMPTY_LINE}
        </EuiText>
      </>
    );
  };

  const renderMetrics = () => {
    if (metrics.length === 1) {
      return <>{renderSingleMetric(metrics[0])}</>;
    }

    return (
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        {metrics.map((metric, index) => (
          <EuiFlexGroup key={index} direction="column" gutterSize="s">
            {renderSingleMetric(metric)}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder={true} grow>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
          >
            <EuiFlexItem grow>
              <EuiText size="s">
                <b data-test-subj={dataTestSubj && `${dataTestSubj}-title`}>{title}</b>
              </EuiText>
            </EuiFlexItem>
            {renderActionButtons()}
          </EuiFlexGroup>
        </EuiFlexItem>
        {renderMetrics()}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
