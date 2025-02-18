/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { ResponseErrorBody } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';

export const getErrorMessage = (error: ResponseErrorBody) => {
  if (error.statusCode === 403) {
    return (
      <FormattedMessage
        id="xpack.ingestPipelines.manageProcessors.deniedPrivilegeDescription"
        defaultMessage="To manage geoIP databases, you must have the {manage} cluster privilege."
        values={{
          manage: <EuiCode>manage</EuiCode>,
        }}
      />
    );
  }

  return error.message;
};
