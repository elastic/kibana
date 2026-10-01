/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Investigation } from '../../../types';
import { impactPills } from './impact_pills';
import { IMPACT_LABELS } from './translations';

interface ImpactProps {
  investigations: Investigation[];
  entityFilter: string | null;
  onEntityFilterChange: (entityId: string | null) => void;
}

export const Impact: React.FC<ImpactProps> = ({
  investigations,
  entityFilter,
  onEntityFilterChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const pills = useMemo(() => impactPills(investigations), [investigations]);

  if (pills.length === 0) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xxs" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
        <h3>{IMPACT_LABELS.title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        alignItems="center"
        aria-label={IMPACT_LABELS.title}
      >
        {pills.map((pill) => (
          <EuiFlexItem key={pill.entityId} grow={false}>
            <EuiBadge
              style={{ padding: euiTheme.size.xs, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() =>
                onEntityFilterChange(entityFilter === pill.entityId ? null : pill.entityId)
              }
              onClickAriaLabel={pill.entityId}
              css={css({
                background:
                  entityFilter === pill.entityId
                    ? euiTheme.colors.backgroundBaseHighlighted
                    : euiTheme.colors.emptyShade,
                border: `1px solid ${
                  entityFilter === pill.entityId
                    ? euiTheme.colors.darkShade
                    : euiTheme.colors.lightShade
                }`,
                '&:hover': {
                  border: `1px solid ${
                    entityFilter === pill.entityId
                      ? euiTheme.colors.darkShade
                      : euiTheme.colors.borderInteractiveFormsHoverPlain
                  }`,
                },
              })}
            >
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                responsive={false}
                direction="row"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" style={{ padding: `0 ${euiTheme.size.xs}` }}>
                    <EuiTextTruncate text={pill.entityId} width={120} truncation="end" />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{pill.count}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
