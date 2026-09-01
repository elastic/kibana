/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import * as i18n from '../../translations';

interface InlineFieldActionsProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

const preventMouseDownDefault = (event: React.MouseEvent<HTMLButtonElement>) =>
  event.preventDefault();

export const InlineFieldActions: FC<InlineFieldActionsProps> = React.memo(
  ({ name, onConfirm, onCancel, isLoading = false, isDisabled = false }) => (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.CONFIRM_FIELD_EDIT} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="check"
            color="success"
            aria-label={i18n.CONFIRM_FIELD_EDIT}
            data-test-subj={`template-field-confirm-${name}`}
            onMouseDown={preventMouseDownDefault}
            onClick={onConfirm}
            isLoading={isLoading}
            isDisabled={isDisabled}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.CANCEL_FIELD_EDIT} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            aria-label={i18n.CANCEL_FIELD_EDIT}
            data-test-subj={`template-field-cancel-${name}`}
            onMouseDown={preventMouseDownDefault}
            onClick={onCancel}
            isDisabled={isLoading}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
InlineFieldActions.displayName = 'InlineFieldActions';
