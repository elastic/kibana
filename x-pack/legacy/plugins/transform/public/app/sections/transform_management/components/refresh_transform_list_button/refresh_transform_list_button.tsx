/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface RefreshTransformListButton {
  isLoading: boolean;
  onClick(): void;
}
export const RefreshTransformListButton: FC<RefreshTransformListButton> = ({
  onClick,
  isLoading,
}) => (
  <EuiButton
    color="secondary"
    iconType="refresh"
    data-test-subj="transformRefreshTransformListButton"
    onClick={onClick}
    isLoading={isLoading}
  >
    <FormattedMessage
      id="xpack.transform.transformList.refreshButtonLabel"
      defaultMessage="Reload"
    />
  </EuiButton>
);
