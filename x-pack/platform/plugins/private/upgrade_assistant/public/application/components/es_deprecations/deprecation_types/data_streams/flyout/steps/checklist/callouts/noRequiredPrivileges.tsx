/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const NoPrivilegesCallout: React.FunctionComponent = () => {
  return (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.checklistStep.insufficientPrivilegeCallout.calloutTitle"
            defaultMessage="You do not have sufficient privileges to migrate this data stream"
          />
        }
        color="danger"
        iconType="warning"
        data-test-subj="dsInsufficientPrivilegesCallout"
      />
      <EuiSpacer size="s" />
    </Fragment>
  );
};
