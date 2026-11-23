/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export interface WorkflowExecutionsFullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

export const WorkflowExecutionsFullscreenButton =
  React.memo<WorkflowExecutionsFullscreenButtonProps>(({ isFullscreen, onToggle, buttonRef }) => {
    const label = isFullscreen
      ? i18n.translate('workflows.executionsPage.table.exitFullscreen', {
          defaultMessage: 'Exit fullscreen',
        })
      : i18n.translate('workflows.executionsPage.table.enterFullscreen', {
          defaultMessage: 'Enter fullscreen',
        });

    return (
      <EuiToolTip content={label} disableScreenReaderOutput>
        <EuiButtonIcon
          buttonRef={buttonRef}
          size="xs"
          color="text"
          iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
          aria-label={label}
          onClick={onToggle}
          data-test-subj="executionsTableFullscreen"
        />
      </EuiToolTip>
    );
  });

WorkflowExecutionsFullscreenButton.displayName = 'WorkflowExecutionsFullscreenButton';
