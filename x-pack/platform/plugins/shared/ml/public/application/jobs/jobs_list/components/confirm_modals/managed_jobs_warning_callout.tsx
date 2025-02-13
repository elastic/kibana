/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ManagedJobsWarningCallout = ({
  jobsCount,
  action,
  message,
}: {
  jobsCount: number;
  action?: string;
  message?: string;
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut color="warning">
        {message ?? (
          <FormattedMessage
            id="xpack.ml.managedJobsWarningCallout"
            defaultMessage="{jobsCount, plural, one {This job} other {At least one of these jobs}} is preconfigured by Elastic; {action} {jobsCount, plural, one {it} other {them}} might impact other parts of the product."
            values={{
              jobsCount,
              action,
            }}
          />
        )}
      </EuiCallOut>
    </>
  );
};
