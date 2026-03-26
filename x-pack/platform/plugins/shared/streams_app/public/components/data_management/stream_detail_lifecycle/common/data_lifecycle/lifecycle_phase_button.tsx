/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { getInteractivePanelStyles } from './interactive_panel_styles';

interface LifecyclePhaseButtonProps {
  euiTheme: EuiThemeComputed;
  isDelete: boolean;
  isPopoverOpen: boolean;
  isBeingEdited?: boolean;
  label: string;
  onClick: () => void;
  phaseColor?: string;
  size?: string;
  testSubjPrefix?: string;
  isEditLifecycleFlyoutOpen?: boolean;
}

export const LifecyclePhaseButton = ({
  euiTheme,
  isDelete,
  isPopoverOpen,
  isBeingEdited = false,
  label,
  onClick,
  phaseColor,
  size,
  testSubjPrefix,
  isEditLifecycleFlyoutOpen = false,
}: LifecyclePhaseButtonProps) => {
  const prefix = testSubjPrefix ? `${testSubjPrefix}-` : '';

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder={false}
      hasShadow={false}
      role="button"
      data-test-subj={
        isDelete
          ? `${prefix}lifecyclePhase-delete-button`
          : `${prefix}lifecyclePhase-${label}-button`
      }
      aria-label={
        isDelete
          ? i18n.translate('xpack.streams.streamDetailLifecycle.deletePhase.ariaLabel', {
              defaultMessage: 'Delete phase',
            })
          : i18n.translate('xpack.streams.streamDetailLifecycle.phase.ariaLabel', {
              defaultMessage: '{phase} phase',
              values: { phase: label },
            })
      }
      onClick={onClick}
      css={getInteractivePanelStyles({
        euiTheme,
        backgroundColor: phaseColor ?? euiTheme.colors.backgroundBaseSubdued,
        isPopoverOpen: isPopoverOpen || isBeingEdited,
        minHeight: '48px',
        ...(isDelete
          ? {
              minWidth: '50px',
              padding: '0',
              alignCenter: true,
            }
          : {}),
      })}
      grow={false}
    >
      {isDelete ? (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          responsive={false}
          style={{ width: '100%', height: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon
              size="m"
              type="trash"
              aria-hidden={true}
              data-test-subj={`${prefix}dataLifecycle-delete-icon`}
              title={i18n.translate('xpack.streams.streamDetailLifecycle.deletePhase.iconTitle', {
                defaultMessage: 'Delete phase',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          <EuiText
            size="xs"
            color={euiTheme.colors.plainDark}
            data-test-subj={`${prefix}lifecyclePhase-${label}-name`}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              fontWeight: euiTheme.font.weight.semiBold,
            }}
          >
            {capitalize(label)}
          </EuiText>
          <EuiText
            size="xs"
            color={euiTheme.colors.plainDark}
            data-test-subj={
              size && !isEditLifecycleFlyoutOpen
                ? `${prefix}lifecyclePhase-${label}-size`
                : undefined
            }
            title={size && !isEditLifecycleFlyoutOpen ? size : undefined}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {size && !isEditLifecycleFlyoutOpen ? size : null}
          </EuiText>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
