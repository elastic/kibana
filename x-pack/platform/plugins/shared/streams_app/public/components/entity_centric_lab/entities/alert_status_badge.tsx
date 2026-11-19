/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';

const labelRowCss = css`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

/**
 * Alert count badge. When `showMaintenanceIcon` is set, a bell-off mark sits
 * beside the label: the alert is still active, and notifications and actions for those are paused.
 */
export const AlertStatusBadge = ({
  color,
  label,
  tooltip,
  showMaintenanceIcon = false,
  onClick,
  onClickAriaLabel,
  dataTestSubj,
}: {
  readonly color: string;
  readonly label: string;
  readonly tooltip?: string;
  readonly showMaintenanceIcon?: boolean;
  readonly onClick?: () => void;
  readonly onClickAriaLabel?: string;
  readonly dataTestSubj?: string;
}) => {
  const badge = (
    <EuiBadge
      color={color}
      onClick={onClick}
      onClickAriaLabel={onClickAriaLabel}
      data-test-subj={dataTestSubj}
    >
      <span css={labelRowCss}>
        {label}
        {showMaintenanceIcon ? (
          <EuiIcon
            type="bellSlash"
            size="s"
            color="inherit"
            aria-hidden
            data-test-subj="entityCentricLabMaintenanceIcon"
          />
        ) : null}
      </span>
    </EuiBadge>
  );
  if (!tooltip) return badge;
  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      {badge}
    </EuiToolTip>
  );
};
