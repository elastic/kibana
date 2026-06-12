/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  isDisabled?: boolean;
  onClick?: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const ManageSpacesButton: React.FC<Props> = ({
  isDisabled,
  onClick,
  capabilities,
  navigateToApp,
}) => {
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
    <EuiButtonEmpty
      size={'s'}
      isDisabled={isDisabled}
      onClick={navigateToManageSpaces}
      data-test-subj="manageSpaces"
    >
      <FormattedMessage
        id="xpack.spaces.manageSpacesButton.manageSpacesButtonLabel"
        defaultMessage="Manage"
      />
    </EuiButtonEmpty>
  );
};
