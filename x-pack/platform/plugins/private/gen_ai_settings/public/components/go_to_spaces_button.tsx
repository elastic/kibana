/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface GoToSpacesButtonProps {
  getUrlForSpaces: (toPermissions?: boolean) => string;
  navigateToPermissions?: boolean;
}

export const GoToSpacesButton: React.FC<GoToSpacesButtonProps> = ({
  getUrlForSpaces,
  navigateToPermissions = false,
}) => {
  const label = navigateToPermissions
    ? i18n.translate('genAiSettings.goToPermissionsTabButtonLabel', {
        defaultMessage: 'Go to Permissions tab',
      })
    : i18n.translate('genAiSettings.goToSpacesButtonLabel', {
        defaultMessage: 'Go to spaces',
      });

  return (
    <EuiButton
      iconType="popout"
      iconSide="right"
      data-test-subj={
        navigateToPermissions
          ? 'genAiSettingsGoToPermissionsTabButton'
          : 'genAiSettingsGoToSpacesButton'
      }
      href={getUrlForSpaces(navigateToPermissions)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </EuiButton>
  );
};
