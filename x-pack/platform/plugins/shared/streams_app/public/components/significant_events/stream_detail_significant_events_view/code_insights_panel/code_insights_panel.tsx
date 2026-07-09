/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CodeInsights } from '../../../../hooks/significant_events/use_stream_code_features';

interface CodeInsightsPanelProps {
  insights: CodeInsights;
}

/**
 * Compact summary of the code-derived Feature KIs (repo type, language, service
 * name) for a stream. Rendered separately from the main KI table because these
 * are computed `code_analysis` features hidden from that table.
 */
export function CodeInsightsPanel({ insights }: CodeInsightsPanelProps) {
  const items: Array<{ label: string; value: React.ReactNode }> = [];

  if (insights.repository) {
    items.push({
      label: REPOSITORY_LABEL,
      value: <EuiBadge color="hollow">{insights.repository}</EuiBadge>,
    });
  }
  if (insights.repoType) {
    items.push({
      label: REPO_TYPE_LABEL,
      value: (
        <EuiBadge color="hollow" css={{ textTransform: 'capitalize' }}>
          {insights.repoType}
        </EuiBadge>
      ),
    });
  }
  if (insights.language) {
    items.push({
      label: LANGUAGE_LABEL,
      value: <EuiBadge color="hollow">{insights.language}</EuiBadge>,
    });
  }
  if (insights.serviceName) {
    items.push({
      label: SERVICE_NAME_LABEL,
      value: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">{insights.serviceName}</EuiBadge>
          </EuiFlexItem>
          {insights.servicePredicted ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={PREDICTED_TOOLTIP}>
                <EuiBadge color="warning">{PREDICTED_LABEL}</EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ),
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={true}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="editorCodeBlock" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xl" wrap responsive={false} css={{ marginTop: 8 }}>
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.label}>
            <EuiText size="xs" color="subdued">
              {item.label}
            </EuiText>
            <div css={{ marginTop: 4 }}>{item.value}</div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const TITLE = i18n.translate('xpack.streams.codeInsightsPanel.title', {
  defaultMessage: 'Code Intelligence',
});

const REPOSITORY_LABEL = i18n.translate('xpack.streams.codeInsightsPanel.repositoryLabel', {
  defaultMessage: 'Repository',
});

const REPO_TYPE_LABEL = i18n.translate('xpack.streams.codeInsightsPanel.repoTypeLabel', {
  defaultMessage: 'Repository type',
});

const LANGUAGE_LABEL = i18n.translate('xpack.streams.codeInsightsPanel.languageLabel', {
  defaultMessage: 'Language',
});

const SERVICE_NAME_LABEL = i18n.translate('xpack.streams.codeInsightsPanel.serviceNameLabel', {
  defaultMessage: 'Service name',
});

const PREDICTED_LABEL = i18n.translate('xpack.streams.codeInsightsPanel.predictedLabel', {
  defaultMessage: 'Predicted',
});

const PREDICTED_TOOLTIP = i18n.translate('xpack.streams.codeInsightsPanel.predictedTooltip', {
  defaultMessage: 'Resolved from code; not yet observed in logs',
});
