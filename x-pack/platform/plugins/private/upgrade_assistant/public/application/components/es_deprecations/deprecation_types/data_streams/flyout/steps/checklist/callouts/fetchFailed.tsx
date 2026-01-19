/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface FetchFailedCalloutProps {
  hasFetchFailed: boolean;
  errorMessage: string | null;
}

export const FetchFailedCallout: React.FunctionComponent<FetchFailedCalloutProps> = ({
  hasFetchFailed,
  errorMessage,
}) => {
  return (
    <>
      <EuiCallOut
        color="danger"
        iconType="warning"
        data-test-subj={hasFetchFailed ? 'fetchFailedCallout' : 'dataStreamMigrationFailedCallout'}
        title={
          hasFetchFailed ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.callouts.fetchFailedCalloutTitle"
              defaultMessage="Data stream migration status not available"
            />
          ) : (
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.callouts.migrationFailedCalloutTitle"
              defaultMessage="Data stream migration error"
            />
          )
        }
      >
        {errorMessage}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
