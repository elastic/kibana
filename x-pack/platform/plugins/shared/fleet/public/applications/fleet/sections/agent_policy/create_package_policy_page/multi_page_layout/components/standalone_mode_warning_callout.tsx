/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';

import type { MultiPageStepLayoutProps } from '../types';

export const StandaloneModeWarningCallout: React.FC<{
  setIsManaged: MultiPageStepLayoutProps['setIsManaged'];
}> = ({ setIsManaged }) => {
  return (
    <EuiCallOut
      title="Setting up to run Elastic Agent in standalone mode"
      color="primary"
      iconType="iInCircle"
    >
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.addIntegration.standaloneWarning"
          defaultMessage="Setting up integrations by running Elastic Agent in standalone mode is advanced. When possible, we recommend using {link} instead. "
          values={{ link: <EuiLink href="#">Fleet-managed agents</EuiLink> }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton onClick={() => setIsManaged(true)} color="primary">
        <FormattedMessage
          id="xpack.fleet.addIntegration.switchToManagedButton"
          defaultMessage="Enroll in Fleet instead (recommended)"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
