/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';

interface SourceRowProps {
  /** Plain-text label, used for the remove action and as the default content. */
  label: string;
  typeLabel: string;
  icon: ReactNode;
  /** Overrides how the label is rendered, e.g. as a code block. */
  children?: ReactNode;
  onRemove?: () => void;
  'data-test-subj'?: string;
}

export const SourceRow = ({
  label,
  typeLabel,
  icon,
  children,
  onRemove,
  'data-test-subj': dataTestSubj,
}: SourceRowProps) => {
  const removeLabel = i18n.translate('xpack.contextEngine.sourceRow.removeAriaLabel', {
    defaultMessage: 'Remove {label}',
    values: { label },
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>{children ?? label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="contextSourceTypeBadge">
            {typeLabel}
          </EuiBadge>
        </EuiFlexItem>
        {onRemove && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={removeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onRemove}
                aria-label={removeLabel}
                data-test-subj="contextRemoveSourceButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
