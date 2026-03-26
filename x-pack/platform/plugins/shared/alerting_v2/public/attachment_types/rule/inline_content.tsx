/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { RuleAttachment } from '../../../common/attachment_types';

const KIND_LABELS: Record<string, string> = {
  alert: 'Alert',
  signal: 'Signal',
};

const MAX_QUERY_LENGTH = 120;

const truncateQuery = (query: string): string => {
  if (query.length <= MAX_QUERY_LENGTH) return query;
  return `${query.slice(0, MAX_QUERY_LENGTH)}…`;
};

export const RuleInlineContent = ({ attachment }: AttachmentRenderProps<RuleAttachment>) => {
  const { euiTheme } = useEuiTheme();
  const { data } = attachment;

  const badgeStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
  });

  const queryStyles = css({
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.size.m,
    lineHeight: 1.4,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    backgroundColor: euiTheme.colors.lightestShade,
    borderRadius: euiTheme.border.radius.small,
    wordBreak: 'break-all' as const,
  });

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <div css={badgeStyles}>
            <EuiBadge color={data.kind === 'alert' ? 'warning' : 'primary'}>
              {KIND_LABELS[data.kind] ?? data.kind}
            </EuiBadge>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div css={badgeStyles}>
            <EuiBadge color="hollow">every {data.schedule.every}</EuiBadge>
          </div>
        </EuiFlexItem>
        {data.grouping?.fields?.length ? (
          <EuiFlexItem grow={false}>
            <div css={badgeStyles}>
              <EuiBadge color="hollow">by {data.grouping.fields.join(', ')}</EuiBadge>
            </div>
          </EuiFlexItem>
        ) : null}
        {data.sourceIndex && (
          <EuiFlexItem grow={false}>
            <div css={badgeStyles}>
              <EuiBadge color="hollow">{data.sourceIndex}</EuiBadge>
            </div>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" css={queryStyles}>
        {truncateQuery(data.evaluation.query.base)}
      </EuiText>
    </EuiPanel>
  );
};
