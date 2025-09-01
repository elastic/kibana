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
  subtitle: string | string[] | React.ReactNode;
}

interface BaseMetricCardProps {
  title: React.ReactNode;
  actions?: ActionButton[] | React.ReactNode;
  metrics: Metrics[];
  grow?: boolean;
}

export const BaseMetricCard: React.FC<BaseMetricCardProps> = ({
  title,
  actions,
  metrics,
  grow = false,
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

  const renderMetrics = () => {
    if (metrics.length === 1) {
      const metric = metrics[0];
      return (
        <>
          <EuiFlexItem>
            <EuiText size="m">
              <h3>{metric.data}</h3>
            </EuiText>
          </EuiFlexItem>
          {metric.subtitle && (
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {Array.isArray(metric.subtitle) ? metric.subtitle.join(' · ') : metric.subtitle}
              </EuiText>
            </EuiFlexItem>
          )}
        </>
      );
    }

    return (
      <EuiFlexGroup direction="row">
        {metrics.map((metric, index) => (
          <EuiFlexGroup key={index} direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="m">
                <h3>{metric.data}</h3>
              </EuiText>
            </EuiFlexItem>
            {metric.subtitle && (
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {Array.isArray(metric.subtitle) ? metric.subtitle.join(' · ') : metric.subtitle}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder={true} grow={grow}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" style={{ minHeight: 24 }}>
            <EuiFlexItem>
              <EuiText size="s">
                <b>{title}</b>
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
