/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function PageErrorForbidden() {
  return (
    <EuiPageContent>
      <EuiEmptyPrompt
        iconType="securityApp"
        iconColor={undefined}
        title={
          <h1>
            <FormattedMessage
              id="xpack.idxMgmt.pageErrorForbidden.title"
              defaultMessage="You do not have permissions to use Index Management"
            />
          </h1>
        }
      />
    </EuiPageContent>
  );
}
