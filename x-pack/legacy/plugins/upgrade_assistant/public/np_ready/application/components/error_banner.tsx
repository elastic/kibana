/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { UpgradeAssistantTabProps } from './types';

export const LoadingErrorBanner: React.FunctionComponent<Pick<
  UpgradeAssistantTabProps,
  'loadingError'
>> = ({ loadingError }) => {
  if (get(loadingError, 'response.status') === 403) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.forbiddenErrorCallout.calloutTitle"
            defaultMessage="You do not have sufficient privileges to view this page."
          />
        }
        color="danger"
        iconType="cross"
      />
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.upgradeAssistant.genericErrorCallout.calloutTitle"
          defaultMessage="An error occurred while retrieving the checkup results."
        />
      }
      color="danger"
      iconType="cross"
    >
      {loadingError ? loadingError.message : null}
    </EuiCallOut>
  );
};
