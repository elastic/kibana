/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const InstalledIntegrationsActionMenu: React.FunctionComponent = () => {
  const button = (
    <EuiButton iconType="arrowDown" iconSide="right" disabled onClick={() => {}}>
      <FormattedMessage
        id="xpack.fleet.epmInstalledIntegrations.actionButton"
        defaultMessage="Actions"
      />
    </EuiButton>
  );

  return button;
};
