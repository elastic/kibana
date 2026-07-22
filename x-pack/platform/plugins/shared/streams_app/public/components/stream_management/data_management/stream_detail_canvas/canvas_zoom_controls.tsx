/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useReactFlow, useStore } from '@xyflow/react';
import { FIT_VIEW_DURATION, FIT_VIEW_PADDING, MAX_ZOOM, MIN_ZOOM } from './canvas_constants';

// Guard against floating-point drift when comparing the live zoom to its bounds.
const ZOOM_LIMIT_EPSILON = 0.001;

interface ZoomButtonProps {
  iconType: IconType;
  label: string;
  onClick: () => void;
  dataTestSubj: string;
  disabled?: boolean;
  hasTopBorder?: boolean;
}

function ZoomButton({
  iconType,
  label,
  onClick,
  dataTestSubj,
  disabled,
  hasTopBorder,
}: ZoomButtonProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      data-test-subj={dataTestSubj}
      css={css`
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
        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
          outline-offset: -${euiTheme.focus.width};
        }
        &:disabled {
          cursor: not-allowed;
          color: ${euiTheme.colors.textDisabled};
          background-color: transparent;
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
  const zoom = useStore((state) => state.transform[2]);

  const canZoomIn = zoom < MAX_ZOOM - ZOOM_LIMIT_EPSILON;
  const canZoomOut = zoom > MIN_ZOOM + ZOOM_LIMIT_EPSILON;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="none"
      data-test-subj="streamsCanvasZoomControls"
      css={css`
        position: absolute;
        left: ${euiTheme.size.l};
        bottom: ${euiTheme.size.l};
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
        dataTestSubj="streamsCanvasZoomIn"
        label={i18n.translate('xpack.streams.canvas.zoomIn', {
          defaultMessage: 'Zoom in',
        })}
        onClick={() => zoomIn()}
        disabled={!canZoomIn}
      />
      <ZoomButton
        iconType="minusCircle"
        dataTestSubj="streamsCanvasZoomOut"
        label={i18n.translate('xpack.streams.canvas.zoomOut', {
          defaultMessage: 'Zoom out',
        })}
        onClick={() => zoomOut()}
        disabled={!canZoomOut}
      />
      <ZoomButton
        iconType="crosshairs"
        dataTestSubj="streamsCanvasFitToScreen"
        label={i18n.translate('xpack.streams.canvas.fitToScreen', {
          defaultMessage: 'Fit to screen',
        })}
        onClick={() => fitView({ padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION })}
        hasTopBorder
      />
    </EuiPanel>
  );
}
