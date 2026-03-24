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
  EuiHorizontalRule,
  EuiIcon,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface LibraryToggleRowProps {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  onToggle: (isActive: boolean) => void;
  isMutating: boolean;
  isDisabled?: boolean;
  disabledBadgeLabel?: string;
  disabledTooltipTitle?: string;
  disabledTooltipBody?: string;
}

const EUI_TEXT_STYLES = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const LibraryToggleRow: React.FC<LibraryToggleRowProps> = ({
  name,
  description,
  isActive,
  onToggle,
  isMutating,
  isDisabled = false,
  disabledBadgeLabel,
  disabledTooltipTitle,
  disabledTooltipBody,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {name}
            </EuiText>
          </EuiFlexItem>
          {isDisabled && (
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoElastic" size="m" aria-hidden={true} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued" css={EUI_TEXT_STYLES}>
          {description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isDisabled ? (
          <EuiToolTip
            content={
              disabledTooltipTitle || disabledTooltipBody ? (
                <>
                  {disabledTooltipTitle && (
                    <p>
                      <strong>{disabledTooltipTitle}</strong>
                    </p>
                  )}
                  {disabledTooltipTitle && disabledTooltipBody && <EuiHorizontalRule margin="xs" />}
                  {disabledTooltipBody && <p>{disabledTooltipBody}</p>}
                </>
              ) : undefined
            }
          >
            <EuiBadge tabIndex={0} color="hollow">
              {disabledBadgeLabel ?? 'Auto-included'}
            </EuiBadge>
          </EuiToolTip>
        ) : (
          <EuiSwitch
            label={name}
            showLabel={false}
            checked={isActive}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={isMutating}
            compressed
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
