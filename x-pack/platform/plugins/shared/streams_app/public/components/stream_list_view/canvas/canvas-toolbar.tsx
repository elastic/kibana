/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The floating bottom-center toolbar: Undo/Redo, Source/Destination palette
// (drag or click-to-place), and the "..." overflow menu holding Cleanup.

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/css';
import { useReactFlow } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
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
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CanvasControls({
  placementType,
  onActivatePlacement,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlsProps) {
  const { euiTheme } = useEuiTheme();

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
        border-radius: 8px;
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
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
            iconType="plus"
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
            iconType="plus"
            label={i18n.translate('xpack.streams.streamsCanvas.addDestination', {
              defaultMessage: 'Destination',
            })}
            isActive={placementType === 'destination'}
            onActivate={onActivatePlacement}
          />
        </EuiFlexItem>

      </EuiFlexGroup>
    </EuiPanel>
  );
}

// The vertical zoom controls pinned to the bottom-right of the canvas: zoom in,
// zoom out, a divider, then fit-to-screen. Matches the design mockup — a white,
// subtly-bordered rounded panel with 12px icons in 12px/8px padded cells.
function ZoomButton({
  iconType,
  label,
  onClick,
  hasTopBorder = false,
}: {
  iconType: IconType;
  label: string;
  onClick: () => void;
  hasTopBorder?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={css`
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.m} ${euiTheme.size.s};
        background: transparent;
        border: none;
        cursor: pointer;
        color: ${euiTheme.colors.textParagraph};
        ${hasTopBorder
          ? `border-top: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};`
          : ''}
        &:hover {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        }
        .euiIcon {
          inline-size: 12px;
          block-size: 12px;
        }
      `}
    >
      <EuiIcon type={iconType} />
    </button>
  );
}

export function CanvasZoomControls() {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="none"
      className={css`
        position: absolute;
        left: 24px;
        bottom: 24px;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <ZoomButton
        iconType="plusCircle"
        label={i18n.translate('xpack.streams.streamsCanvas.zoomIn', {
          defaultMessage: 'Zoom in',
        })}
        onClick={() => zoomIn()}
      />
      <ZoomButton
        iconType="minusCircle"
        label={i18n.translate('xpack.streams.streamsCanvas.zoomOut', {
          defaultMessage: 'Zoom out',
        })}
        onClick={() => zoomOut()}
      />
      <ZoomButton
        iconType="crosshairs"
        label={i18n.translate('xpack.streams.streamsCanvas.fitToScreen', {
          defaultMessage: 'Fit to screen',
        })}
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        hasTopBorder
      />
    </EuiPanel>
  );
}
