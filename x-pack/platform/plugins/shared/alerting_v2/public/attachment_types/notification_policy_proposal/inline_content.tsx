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
import type { NotificationPolicyAttachment } from '../../../common/attachment_types';

const MAX_MATCHER_LENGTH = 100;

const truncateMatcher = (matcher: string): string => {
  if (matcher.length <= MAX_MATCHER_LENGTH) return matcher;
  return `${matcher.slice(0, MAX_MATCHER_LENGTH)}…`;
};

export const NotificationPolicyInlineContent = ({
  attachment,
}: AttachmentRenderProps<NotificationPolicyAttachment>) => {
  const { euiTheme } = useEuiTheme();
  const { data } = attachment;

  const badgeStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
  });

  const matcherStyles = css({
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.size.m,
    lineHeight: 1.4,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    backgroundColor: euiTheme.colors.lightestShade,
    borderRadius: euiTheme.border.radius.small,
    wordBreak: 'break-all' as const,
  });

  const wf = data.workflow;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <div css={badgeStyles}>
            <EuiBadge color="primary">
              {wf.name}
              {wf.source === 'inline' ? ' (new)' : ''}
            </EuiBadge>
          </div>
        </EuiFlexItem>
        {wf.source === 'inline' &&
          wf.connectorTypes?.map((connector) => (
            <EuiFlexItem grow={false} key={connector}>
              <div css={badgeStyles}>
                <EuiBadge color="hollow">{connector}</EuiBadge>
              </div>
            </EuiFlexItem>
          ))}
        {data.throttle && (
          <EuiFlexItem grow={false}>
            <div css={badgeStyles}>
              <EuiBadge color="hollow">throttle: {data.throttle.interval}</EuiBadge>
            </div>
          </EuiFlexItem>
        )}
        {data.groupBy?.length ? (
          <EuiFlexItem grow={false}>
            <div css={badgeStyles}>
              <EuiBadge color="hollow">by {data.groupBy.join(', ')}</EuiBadge>
            </div>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {data.matcher && (
        <EuiText size="xs" css={matcherStyles}>
          {truncateMatcher(data.matcher)}
        </EuiText>
      )}
    </EuiPanel>
  );
};
