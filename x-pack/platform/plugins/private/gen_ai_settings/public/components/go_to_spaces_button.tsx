/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface GoToSpacesButtonProps {
  onNavigateToSpaces: () => void;
  navigateToPermissions?: boolean;
}

export const GoToSpacesButton: React.FC<GoToSpacesButtonProps> = ({
  onNavigateToSpaces,
  navigateToPermissions = false,
}) => {
  return (
    <EuiButton
      iconType="popout"
      iconSide="right"
      data-test-subj={navigateToPermissions ? 'goToPermissionsTabButton' : 'goToSpacesButton'}
      onClick={onNavigateToSpaces}
    >
      <FormattedMessage
        id={
          navigateToPermissions
            ? 'genAiSettings.goToPermissionsTabButtonLabel'
            : 'genAiSettings.goToSpacesButtonLabel'
        }
        defaultMessage={navigateToPermissions ? 'Go to Permissions tab' : 'Go to Space Settings'}
      />
    </EuiButton>
  );
};
