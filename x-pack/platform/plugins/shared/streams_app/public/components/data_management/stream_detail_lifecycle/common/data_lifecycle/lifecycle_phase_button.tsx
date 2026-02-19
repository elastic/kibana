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
  label: string;
  onClick: () => void;
  phaseColor?: string;
  size?: string;
  testSubjPrefix?: string;
}

export const LifecyclePhaseButton = ({
  euiTheme,
  isDelete,
  isPopoverOpen,
  label,
  onClick,
  phaseColor,
  size,
  testSubjPrefix,
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
        isPopoverOpen,
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
            <EuiIcon size="m" type="trash" data-test-subj={`${prefix}dataLifecycle-delete-icon`} />
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
            }}
          >
            <b>{capitalize(label)}</b>
          </EuiText>
          {size && (
            <EuiText
              size="xs"
              color={euiTheme.colors.plainDark}
              data-test-subj={`${prefix}lifecyclePhase-${label}-size`}
              title={size}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {size}
            </EuiText>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
