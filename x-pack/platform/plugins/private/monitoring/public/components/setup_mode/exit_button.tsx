/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import React from 'react';

interface SetupModeExitButtonProps {
  exitSetupMode: () => void;
}

export function SetupModeExitButton({ exitSetupMode }: SetupModeExitButtonProps) {
  return (
    <EuiButton
      color="danger"
      fill
      iconType="flag"
      iconSide="right"
      size="s"
      onClick={exitSetupMode}
      data-test-subj="exitSetupModeBtn"
    >
      {i18n.translate('xpack.monitoring.setupMode.exit', {
        defaultMessage: `Exit setup mode`,
      })}
    </EuiButton>
  );
}
