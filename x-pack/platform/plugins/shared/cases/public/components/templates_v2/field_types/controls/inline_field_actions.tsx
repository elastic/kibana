/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from '../../translations';

interface InlineFieldActionsProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const InlineFieldActions: FC<InlineFieldActionsProps> = ({ name, onConfirm, onCancel }) => (
  <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="check"
        color="success"
        aria-label={i18n.CONFIRM_FIELD_EDIT}
        data-test-subj={`template-field-confirm-${name}`}
        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
        onClick={onConfirm}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="cross"
        color="danger"
        aria-label={i18n.CANCEL_FIELD_EDIT}
        data-test-subj={`template-field-cancel-${name}`}
        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
        onClick={onCancel}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
InlineFieldActions.displayName = 'InlineFieldActions';
