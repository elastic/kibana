/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The floating bottom-center toolbar: Select/Pan mode toggle, Undo/Redo,
// Source/Destination palette (drag or click-to-place), and the "..." overflow
// menu holding Cleanup.

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { SelectCursorIcon } from '../select_cursor_icon';
import { HandCursorIcon } from '../hand_cursor_icon';
import { DRAG_DATA_TYPE, type CanvasNodeType } from './constants';

interface PaletteButtonProps {
  type: CanvasNodeType;
  iconType: string;
  label: string;
  isActive: boolean;
  onActivate: (type: CanvasNodeType) => void;
}

function PaletteButton({ type, iconType, label, isActive, onActivate }: PaletteButtonProps) {
  const { euiTheme } = useEuiTheme();

  const onDragStart = useCallback(
    (event: React.DragEvent) => {
      event.dataTransfer.setData(DRAG_DATA_TYPE, type);
      event.dataTransfer.effectAllowed = 'move';
    },
    [type]
  );

  return (
    <EuiPanel
      element="button"
      hasShadow={false}
      hasBorder
      paddingSize="s"
      draggable
      onDragStart={onDragStart}
      onClick={() => onActivate(type)}
      className={css`
        cursor: grab;
        border-radius: ${euiTheme.border.radius.medium};
        ${isActive ? `border-color: ${euiTheme.colors.primary};` : ''}
        &:active {
          cursor: grabbing;
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            className={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textParagraph};
            `}
          >
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export interface CanvasControlsProps {
  placementType: CanvasNodeType | null;
  onActivatePlacement: (type: CanvasNodeType) => void;
  onCleanup: () => void;
  canvasMode: 'select' | 'pan';
  onChangeMode: (mode: 'select' | 'pan') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CanvasControls({
  placementType,
  onActivatePlacement,
  onCleanup,
  canvasMode,
  onChangeMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlsProps) {
  const { euiTheme } = useEuiTheme();
  // Overflow ("...") menu anchored at the end of the toolbar, holding lower-use
  // canvas actions like Cleanup (auto-layout).
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toolButton = (
    iconType: IconType,
    label: string,
    opts?: { isActive?: boolean; onClick?: () => void; isDisabled?: boolean }
  ) => (
    <EuiButtonIcon
      iconType={iconType}
      color={opts?.isActive ? 'primary' : 'text'}
      display={opts?.isActive ? 'base' : 'empty'}
      size="s"
      aria-label={label}
      aria-pressed={opts?.isActive}
      isDisabled={opts?.isDisabled}
      onClick={opts?.onClick}
    />
  );

  const verticalRule = (
    <EuiHorizontalRule
      margin="none"
      className={css`
        block-size: ${euiTheme.size.l};
        inline-size: ${euiTheme.border.width.thin};
      `}
    />
  );

  return (
    <EuiPanel
      hasShadow
      paddingSize="s"
      className={css`
        position: absolute;
        bottom: ${euiTheme.size.l};
        left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {toolButton(
            SelectCursorIcon,
            i18n.translate('xpack.streams.streamsCanvas.selectTool', {
              defaultMessage: 'Select',
            }),
            { isActive: canvasMode === 'select', onClick: () => onChangeMode('select') }
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {toolButton(
            HandCursorIcon,
            i18n.translate('xpack.streams.streamsCanvas.panTool', {
              defaultMessage: 'Pan',
            }),
            { isActive: canvasMode === 'pan', onClick: () => onChangeMode('pan') }
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          {toolButton(
            'editorUndo',
            i18n.translate('xpack.streams.streamsCanvas.undo', {
              defaultMessage: 'Undo',
            }),
            { onClick: onUndo, isDisabled: !canUndo }
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {toolButton(
            'editorRedo',
            i18n.translate('xpack.streams.streamsCanvas.redo', {
              defaultMessage: 'Redo',
            }),
            { onClick: onRedo, isDisabled: !canRedo }
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PaletteButton
            type="source"
            iconType="dashedCircle"
            label={i18n.translate('xpack.streams.streamsCanvas.addSource', {
              defaultMessage: 'Source',
            })}
            isActive={placementType === 'source'}
            onActivate={onActivatePlacement}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PaletteButton
            type="destination"
            iconType="package"
            label={i18n.translate('xpack.streams.streamsCanvas.addDestination', {
              defaultMessage: 'Destination',
            })}
            isActive={placementType === 'destination'}
            onActivate={onActivatePlacement}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            anchorPosition="upRight"
            panelPaddingSize="none"
            button={
              <EuiButtonIcon
                iconType="boxesVertical"
                color="text"
                size="s"
                aria-label={i18n.translate('xpack.streams.streamsCanvas.moreActions', {
                  defaultMessage: 'More canvas actions',
                })}
                onClick={() => setIsMenuOpen((open) => !open)}
              />
            }
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="cleanup"
                  icon="sparkles"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCleanup();
                  }}
                >
                  {i18n.translate('xpack.streams.streamsCanvas.cleanup', {
                    defaultMessage: 'Cleanup',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
