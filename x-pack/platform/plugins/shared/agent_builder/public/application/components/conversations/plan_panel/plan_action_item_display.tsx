/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { ActionItemStatus, PlanActionItem } from '@kbn/agent-builder-common';

const statusIconMap: Record<
  ActionItemStatus,
  { type: string; color: string; useSpinner?: boolean }
> = {
  pending: { type: 'dot', color: 'subdued' },
  in_progress: { type: 'loading', color: 'primary', useSpinner: true },
  completed: { type: 'checkInCircleFilled', color: 'success' },
  failed: { type: 'error', color: 'danger' },
};

interface PlanActionItemDisplayProps {
  item: PlanActionItem;
  index: number;
  onClick?: (index: number, description: string) => void;
}

export const PlanActionItemDisplay: React.FC<PlanActionItemDisplayProps> = ({
  item,
  index,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const statusConfig = statusIconMap[item.status];
  const isFailed = item.status === 'failed';

  const itemStyles = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.medium};
    cursor: ${onClick ? 'pointer' : 'default'};
    ${isFailed
      ? `
        background-color: ${euiTheme.colors.backgroundFilledDanger}10;
        border-left: 3px solid ${euiTheme.colors.danger};
        padding-left: calc(${euiTheme.size.s} - 3px);
      `
      : ''}
    &:hover {
      background-color: ${isFailed
      ? `${euiTheme.colors.backgroundFilledDanger}20`
      : euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const failedTextStyles = css`
    color: ${euiTheme.colors.danger};
  `;

  const handleClick = () => {
    onClick?.(index, item.description);
  };

  // For failed items, split description at " — " to separate the step name from the error reason
  const renderDescription = () => {
    if (!isFailed) {
      return <p>{item.description}</p>;
    }

    const separatorIndex = item.description.indexOf(' — ');
    if (separatorIndex === -1) {
      return <p css={failedTextStyles}>{item.description}</p>;
    }

    const stepDescription = item.description.substring(0, separatorIndex);
    const errorReason = item.description.substring(separatorIndex + 3);

    return (
      <>
        <p>{stepDescription}</p>
        <p css={failedTextStyles}>
          <small>{errorReason}</small>
        </p>
      </>
    );
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      css={itemStyles}
      onClick={handleClick}
      data-test-subj={`agentBuilderPlanActionItem-${index}`}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={item.status}>
          {statusConfig.useSpinner ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <EuiIcon type={statusConfig.type} color={statusConfig.color} size="s" />
          )}
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{renderDescription()}</EuiText>
        {((item.related_skills && item.related_skills.length > 0) ||
          (item.related_tools && item.related_tools.length > 0)) && (
            <EuiFlexGroup
              gutterSize="xs"
              wrap
              responsive={false}
              css={css`
              margin-top: ${euiTheme.size.xs};
            `}
            >
              {item.related_skills?.map((skill) => (
                <EuiFlexItem grow={false} key={`skill-${skill}`}>
                  <EuiBadge color="hollow" iconType="sparkles">
                    {skill}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
              {item.related_tools?.map((tool) => (
                <EuiFlexItem grow={false} key={`tool-${tool}`}>
                  <EuiBadge color="hollow" iconType="wrench">
                    {tool}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
