/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface RefreshAnalyticsListButtonProps {
  isLoading: boolean;
  onClick(): void;
}
export const RefreshAnalyticsListButton: FC<RefreshAnalyticsListButtonProps> = ({
  onClick,
  isLoading,
}) => (
  <EuiButtonEmpty
    data-test-subj="mlRefreshAnalyticsListButton"
    onClick={onClick}
    isLoading={isLoading}
  >
    <FormattedMessage
      id="xpack.ml.dataframe.analyticsList.refreshButtonLabel"
      defaultMessage="Refresh"
    />
  </EuiButtonEmpty>
);
