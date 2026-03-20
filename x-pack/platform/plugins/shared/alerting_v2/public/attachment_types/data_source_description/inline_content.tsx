/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, useEuiTheme, EuiPanel } from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { DataSourceDescriptionAttachment } from '../../../common/attachment_types';

const formatDocCount = (count: number): string => {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

const TYPE_LABELS: Record<string, string> = {
  data_stream: 'Data stream',
  index: 'Index',
  alias: 'Alias',
};

const INDICATOR_TYPE_COLORS: Record<string, string> = {
  entity: 'accent',
  dependency: 'warning',
  technology: 'success',
  infrastructure: 'primary',
  schema: 'hollow',
};

const TYPE_PATTERN = /\(([^)]+)\)\s*$/;

const getFieldTypeCounts = (schema: unknown): Record<string, number> => {
  if (!schema || typeof schema !== 'object') return {};
  const fields = (schema as Record<string, unknown>).fields;
  if (!fields || typeof fields !== 'object') return {};

  const counts: Record<string, number> = {};
  for (const key of Object.keys(fields as Record<string, unknown>)) {
    const match = key.match(TYPE_PATTERN);
    const types = match ? match[1].split(',').map((t) => t.trim()) : ['unknown'];
    for (const type of types) {
      counts[type] = (counts[type] ?? 0) + 1;
    }
  }
  return counts;
};

export const DataSourceDescriptionInlineContent = ({
  attachment,
}: AttachmentRenderProps<DataSourceDescriptionAttachment>) => {
  const { euiTheme } = useEuiTheme();
  const { data } = attachment;

  const fieldTypeCounts = getFieldTypeCounts(data.schema);
  const fieldTypeEntries = Object.entries(fieldTypeCounts).sort(([, a], [, b]) => b - a);
  const totalFields = fieldTypeEntries.reduce((sum, [, count]) => sum + count, 0);
  const patternCount = data.logPatterns.length;
  const errorCount = data.errorSamples.length;
  const indicators = data.knowledgeIndicators?.indicators ?? [];

  const statStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
  });

  return (
    <EuiPanel hasShadow={false} hasBorder={false}>
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        {data.dataSourceType && (
          <EuiFlexItem grow={false}>
            <div css={statStyles}>
              <EuiBadge color="hollow">
                {TYPE_LABELS[data.dataSourceType] ?? data.dataSourceType}
              </EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {data.docCount != null && data.docCount > 0 && (
          <EuiFlexItem grow={false}>
            <div css={statStyles}>
              <EuiBadge color="primary">{formatDocCount(data.docCount)} docs</EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {totalFields > 0 && (
          <EuiFlexItem grow={false}>
            <div css={statStyles}>
              <EuiBadge color="hollow">
                {totalFields} fields (
                {fieldTypeEntries.map(([type, count]) => `${count} ${type}`).join(', ')})
              </EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {patternCount > 0 && (
          <EuiFlexItem grow={false}>
            <div css={statStyles}>
              <EuiBadge color="hollow">{patternCount} patterns</EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {errorCount > 0 && (
          <EuiFlexItem grow={false}>
            <div css={statStyles}>
              <EuiBadge color="danger">{errorCount} errors</EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {indicators.map((indicator) => (
          <EuiFlexItem grow={false} key={indicator.id}>
            <div css={statStyles}>
              <EuiBadge color={INDICATOR_TYPE_COLORS[indicator.type] ?? 'hollow'}>
                {indicator.title}
              </EuiBadge>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
