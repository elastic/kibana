/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

interface SyncButtonProps {
  isLoading: boolean;
  disabled: boolean;
  hasBeenPushed: boolean;
  connectorName: string;
  onSync: () => void;
  /** Matches `PushButton`: `empty` is the legacy look, `outlined` the redesigned side panel. */
  variant?: 'empty' | 'outlined';
}

const SyncButtonComponent: React.FC<SyncButtonProps> = ({
  isLoading,
  disabled,
  hasBeenPushed,
  connectorName,
  onSync,
  variant = 'empty',
}) => {
  const label = i18n.SYNC_FROM(connectorName);
  const button =
    variant === 'outlined' ? (
      <EuiButton
        data-test-subj="sync-from-external-service"
        size="s"
        color="text"
        iconType="refresh"
        onClick={onSync}
        disabled={disabled}
        isLoading={isLoading}
      >
        {label}
      </EuiButton>
    ) : (
      <EuiButtonEmpty
        data-test-subj="sync-from-external-service"
        iconType="refresh"
        onClick={onSync}
        disabled={disabled}
        isLoading={isLoading}
      >
        {label}
      </EuiButtonEmpty>
    );

  return hasBeenPushed ? (
    button
  ) : (
    <EuiToolTip
      data-test-subj="sync-button-tooltip"
      position="top"
      content={i18n.SYNC_REQUIRES_PUSH(connectorName)}
    >
      {button}
    </EuiToolTip>
  );
};

SyncButtonComponent.displayName = 'SyncButton';

export const SyncButton = React.memo(SyncButtonComponent);
