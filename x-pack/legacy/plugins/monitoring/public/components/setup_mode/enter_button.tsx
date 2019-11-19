/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SetupModeEnterButtonProps {
  enabled: boolean;
  toggleSetupMode: (state: boolean) => void;
}

export const SetupModeEnterButton: React.FC<SetupModeEnterButtonProps> = (
  props: SetupModeEnterButtonProps
) => {
  const [isLoading, setIsLoading] = React.useState(false);

  if (!props.enabled) {
    return null;
  }

  async function enterSetupMode() {
    setIsLoading(true);
    props.toggleSetupMode(true);
  }

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
      <EuiButton onClick={enterSetupMode} iconType="flag" iconSide="right" isLoading={isLoading}>
        {i18n.translate('xpack.monitoring.setupMode.enter', {
          defaultMessage: 'Enter Setup Mode',
        })}
      </EuiButton>
    </div>
  );
};
