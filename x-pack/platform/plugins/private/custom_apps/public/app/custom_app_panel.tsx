/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface CustomAppPanelProps {
  title?: string;
  isEditing: boolean;
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
  onEdit: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

/**
 * Panel chrome. The header doubles as the grid drag handle, which is why it
 * registers itself via `setDragHandles` rather than the grid supplying one.
 */
export function CustomAppPanel({
  title,
  isEditing,
  setDragHandles,
  onEdit,
  onRemove,
  children,
}: CustomAppPanelProps) {
  const { euiTheme } = useEuiTheme();

  const dragHandleRef = useCallback(
    (node: HTMLDivElement | null) => setDragHandles([node]),
    [setDragHandles]
  );

  const editLabel = `Edit panel${title ? ` ${title}` : ''}`;
  const removeLabel = `Remove panel${title ? ` ${title}` : ''}`;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `}
    >
      {/*
        A title-less panel (the header and filter panels, say) should read as
        plain content, so its chrome collapses entirely outside edit mode —
        where the drag handle still has to exist.
      */}
      <EuiFlexGroup
        ref={dragHandleRef}
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        css={css`
          padding: ${title || isEditing ? euiTheme.size.s : 0};
          border-bottom: ${title || isEditing ? euiTheme.border.thin : 'none'};
          cursor: ${isEditing ? 'grab' : 'default'};
          flex-grow: 0;
        `}
      >
        <EuiFlexItem>
          {title && (
            <EuiTitle size="xxs">
              <h2>{title}</h2>
            </EuiTitle>
          )}
        </EuiFlexItem>
        {isEditing && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={editLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="pencil"
                  size="xs"
                  aria-label={editLabel}
                  onClick={onEdit}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="trash"
                  size="xs"
                  color="danger"
                  aria-label={removeLabel}
                  onClick={onRemove}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      <div
        css={css`
          flex-grow: 1;
          overflow: auto;
          padding: ${euiTheme.size.s};
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
}
