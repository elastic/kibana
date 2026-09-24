/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { EuiButtonIcon, EuiPanel, EuiTitle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface CustomAppPanelProps {
  title?: string;
  hideBorder?: boolean;
  isEditing: boolean;
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
  onEdit: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

/**
 * Panel chrome.
 *
 * The header exists only when the panel has a title, in both modes. Reserving a
 * header bar just to hold the edit controls moved every title-less panel's
 * content down as soon as you entered edit mode, so a short row could not be
 * positioned to look right in both. The controls float over the panel instead,
 * on hover or keyboard focus.
 */
export function CustomAppPanel({
  title,
  hideBorder,
  isEditing,
  setDragHandles,
  onEdit,
  onRemove,
  children,
}: CustomAppPanelProps) {
  const { euiTheme } = useEuiTheme();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const gripRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Both the title bar and the pill's grip drag the panel: the bar is the bigger
   * target when there is one, and the grip is the only one a title-less panel
   * has.
   *
   * Nulls are filtered out rather than passed through. `setDragHandles` in
   * `@kbn/grid-layout` does `if (handle === null) return` inside its loop — a
   * `return`, not a `continue` — so a single null abandons the rest of the
   * array. A title-less panel has no header, so `[null, grip]` silently
   * registered nothing and those panels could not be dragged at all.
   */
  const publishHandles = useCallback(() => {
    const handles = [headerRef.current, gripRef.current].filter(
      (node): node is HTMLElement => node !== null
    );
    if (handles.length > 0) setDragHandles(handles);
  }, [setDragHandles]);

  const setHeader = useCallback(
    (node: HTMLDivElement | null) => {
      headerRef.current = node;
      publishHandles();
    },
    [publishHandles]
  );

  const setGrip = useCallback(
    (node: HTMLButtonElement | null) => {
      gripRef.current = node;
      publishHandles();
    },
    [publishHandles]
  );

  const named = title ? ` ${title}` : '';

  return (
    <EuiPanel
      // A borderless panel still needs a frame while editing, or it cannot be
      // seen well enough to select, drag or resize.
      hasBorder={!hideBorder || isEditing}
      color={hideBorder && !isEditing ? 'transparent' : 'plain'}
      paddingSize="none"
      className="customAppPanel"
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
      `}
    >
      {title && (
        <div
          ref={setHeader}
          css={css`
            padding: ${euiTheme.size.s};
            border-bottom: ${euiTheme.border.thin};
            cursor: ${isEditing ? 'grab' : 'default'};
            flex-grow: 0;
          `}
        >
          <EuiTitle size="xxs">
            <h2>{title}</h2>
          </EuiTitle>
        </div>
      )}

      {isEditing && (
        <div
          css={css`
            position: absolute;
            top: ${euiTheme.size.xs};
            inset-inline-end: ${euiTheme.size.xs};
            z-index: 2;
            display: flex;
            gap: ${euiTheme.size.xxs};
            padding: ${euiTheme.size.xxs};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            background-color: ${euiTheme.colors.backgroundBasePlain};
            box-shadow: ${euiTheme.levels.menu ? '0 1px 4px rgba(0,0,0,0.25)' : 'none'};
            opacity: 0;
            transition: opacity ${euiTheme.animation.fast} ease-in;
            /* Revealed on hover, and on keyboard focus so it is reachable
               without a pointer. */
            .customAppPanel:hover &,
            &:focus-within {
              opacity: 1;
            }
            @media (prefers-reduced-motion: reduce) {
              transition: none;
            }
          `}
        >
          <EuiToolTip content={`Move panel${named}`} disableScreenReaderOutput>
            <EuiButtonIcon
              buttonRef={setGrip}
              iconType="move"
              size="xs"
              color="text"
              aria-label={`Move panel${named}`}
              css={css`
                cursor: grab;
              `}
            />
          </EuiToolTip>
          <EuiToolTip content={`Edit panel${named}`} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="pencil"
              size="xs"
              color="text"
              aria-label={`Edit panel${named}`}
              onClick={onEdit}
            />
          </EuiToolTip>
          <EuiToolTip content={`Remove panel${named}`} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              size="xs"
              color="danger"
              aria-label={`Remove panel${named}`}
              onClick={onRemove}
            />
          </EuiToolTip>
        </div>
      )}

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
