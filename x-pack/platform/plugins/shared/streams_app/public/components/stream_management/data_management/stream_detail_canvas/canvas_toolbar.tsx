/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// Placeholder actions are clickable but do nothing yet.
const noop = () => {};

interface ToolButtonProps {
  iconType: IconType;
  label: string;
  dataTestSubj: string;
  onClick?: () => void;
  isDisabled?: boolean;
}

function ToolButton({ iconType, label, dataTestSubj, onClick, isDisabled }: ToolButtonProps) {
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={iconType}
        color="text"
        display="empty"
        size="s"
        aria-label={label}
        isDisabled={isDisabled}
        onClick={onClick}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );
}

interface AddResourceButtonProps {
  label: string;
  tooltip: string;
  dataTestSubj: string;
}

// Non-functional labeled action (e.g. "+ Source") styled as a bordered chip with
// a plus icon and label, matching the prototype's palette buttons. Its real
// behaviour will be wired up when canvas editing lands.
function AddResourceButton({ label, tooltip, dataTestSubj }: AddResourceButtonProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      <EuiPanel
        element="button"
        hasShadow={false}
        hasBorder
        paddingSize="s"
        onClick={noop}
        data-test-subj={dataTestSubj}
        css={css`
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="plus" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
                color: ${euiTheme.colors.textParagraph};
              `}
            >
              {label}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiToolTip>
  );
}

export interface CanvasToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const comingSoonSuffix = i18n.translate('xpack.streams.canvas.toolbar.comingSoonSuffix', {
  defaultMessage: '(coming soon)',
});

/**
 * Floating bottom-center canvas toolbar. Undo/redo are functional; the
 * source/destination actions are placeholders whose real behaviour will be
 * implemented when editing lands.
 */
export function CanvasToolbar({ onUndo, onRedo, canUndo, canRedo }: CanvasToolbarProps) {
  const { euiTheme } = useEuiTheme();

  const verticalRule = (
    <EuiHorizontalRule
      margin="none"
      css={css`
        block-size: ${euiTheme.size.l};
        inline-size: ${euiTheme.border.width.thin};
      `}
    />
  );

  return (
    <EuiPanel
      hasShadow
      paddingSize="s"
      data-test-subj="streamsCanvasToolbar"
      css={css`
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
          <ToolButton
            iconType="editorUndo"
            dataTestSubj="streamsCanvasUndo"
            label={i18n.translate('xpack.streams.canvas.toolbar.undo', {
              defaultMessage: 'Undo',
            })}
            onClick={onUndo}
            isDisabled={!canUndo}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ToolButton
            iconType="editorRedo"
            dataTestSubj="streamsCanvasRedo"
            label={i18n.translate('xpack.streams.canvas.toolbar.redo', {
              defaultMessage: 'Redo',
            })}
            onClick={onRedo}
            isDisabled={!canRedo}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{verticalRule}</EuiFlexItem>

        <EuiFlexItem grow={false}>
          <AddResourceButton
            dataTestSubj="streamsCanvasAddSource"
            label={i18n.translate('xpack.streams.canvas.toolbar.addSource', {
              defaultMessage: 'Source',
            })}
            tooltip={`${i18n.translate('xpack.streams.canvas.toolbar.addSourceTooltip', {
              defaultMessage: 'Add source',
            })} ${comingSoonSuffix}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddResourceButton
            dataTestSubj="streamsCanvasAddDestination"
            label={i18n.translate('xpack.streams.canvas.toolbar.addDestination', {
              defaultMessage: 'Destination',
            })}
            tooltip={`${i18n.translate('xpack.streams.canvas.toolbar.addDestinationTooltip', {
              defaultMessage: 'Add destination',
            })} ${comingSoonSuffix}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
