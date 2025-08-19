/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  isDisabled?: boolean;
  size?: 's' | 'm';
  fullWidth?: boolean;
  onClick?: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const ManageSpacesButton: React.FC<Props> = ({
  isDisabled,
  size,
  fullWidth,
  onClick,
  capabilities,
  navigateToApp,
}) => {
  const { euiTheme } = useEuiTheme();
  const navigateToManageSpaces = () => {
    if (onClick) {
      onClick();
    }

    navigateToApp('management', { path: 'kibana/spaces' });
  };

  if (!capabilities.spaces.manage) {
    return null;
  }

  return (
    <EuiButton
      size={size || 's'}
      isDisabled={isDisabled}
      onClick={navigateToManageSpaces}
      data-test-subj="manageSpaces"
      css={
        fullWidth
          ? { width: `100%` }
          : css`
              margin: ${euiTheme.size.m};
              width: calc(100% - ${euiTheme.size.m} * 2);
            `
      }
    >
      <FormattedMessage
        id="xpack.spaces.manageSpacesButton.manageSpacesButtonLabel"
        defaultMessage="Manage spaces"
      />
    </EuiButton>
  );
};
