/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
import * as i18n from './translations';

interface PushButtonProps {
  isLoading: boolean;
  disabled: boolean;
  errorsMsg: ErrorMessage[];
  hasBeenPushed: boolean;
  showTooltip: boolean;
  connectorName: string;
  pushToService: () => Promise<void>;
  /**
   * `empty` (default) matches the legacy text-link look. `outlined` renders a
   * bordered button, matching the action buttons in the redesigned case header.
   */
  variant?: 'empty' | 'outlined';
}

const PushButtonComponent: React.FC<PushButtonProps> = ({
  disabled,
  errorsMsg,
  isLoading,
  hasBeenPushed,
  connectorName,
  showTooltip,
  pushToService,
  variant = 'empty',
}) => {
  const buttonLabel = hasBeenPushed
    ? i18n.UPDATE_INCIDENT(connectorName)
    : i18n.PUSH_INCIDENT(connectorName);

  const button =
    variant === 'outlined' ? (
      <EuiButton
        data-test-subj="push-to-external-service"
        size="s"
        color="text"
        iconType="download"
        onClick={pushToService}
        disabled={disabled}
        isLoading={isLoading}
      >
        {buttonLabel}
      </EuiButton>
    ) : (
      <EuiButtonEmpty
        data-test-subj="push-to-external-service"
        iconType="download"
        onClick={pushToService}
        disabled={disabled}
        isLoading={isLoading}
      >
        {buttonLabel}
      </EuiButtonEmpty>
    );

  return showTooltip ? (
    <EuiToolTip
      position="top"
      title={errorsMsg.length > 0 ? errorsMsg[0].title : i18n.PUSH_LOCKED_TITLE(connectorName)}
      content={<p>{errorsMsg.length > 0 ? errorsMsg[0].description : i18n.PUSH_LOCKED_DESC}</p>}
      data-test-subj="push-button-tooltip"
    >
      {button}
    </EuiToolTip>
  ) : (
    <>{button}</>
  );
};

PushButtonComponent.displayName = 'PushButton';

export const PushButton = React.memo(PushButtonComponent);
