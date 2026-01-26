/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';

interface Metric {
  data: React.ReactNode;
  subtitle: string | string[] | React.ReactNode | null;
  'data-test-subj'?: string;
}

interface BaseMetricCardProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  metrics: Metric[];
  'data-test-subj'?: string;
}

const EMPTY_LINE = '\u00A0';

export const BaseMetricCard: React.FC<BaseMetricCardProps> = ({
  title,
  actions,
  metrics,
  'data-test-subj': dataTestSubj,
}) => {
  const metric = metrics[0];

  return (
    <EuiPanel hasShadow={false} hasBorder grow color="subdued">
      <EuiFlexGroup direction="column" justifyContent="spaceBetween" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            css={{ minHeight: '32px' }}
          >
            <EuiFlexItem>
              <EuiText size="s">
                <b data-test-subj={dataTestSubj && `${dataTestSubj}-title`}>{title}</b>
              </EuiText>
            </EuiFlexItem>
            {actions && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  {actions}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <h2 data-test-subj={metric['data-test-subj'] && `${metric['data-test-subj']}-metric`}>
              {metric.data}
            </h2>
          </EuiText>
          <EuiText
            size="s"
            color="subdued"
            data-test-subj={
              metric['data-test-subj'] && `${metric['data-test-subj']}-metric-subtitle`
            }
          >
            {metric.subtitle
              ? Array.isArray(metric.subtitle)
                ? metric.subtitle.join(' · ')
                : metric.subtitle
              : EMPTY_LINE}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
