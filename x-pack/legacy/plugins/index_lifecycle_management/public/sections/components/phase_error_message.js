/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
export const PhaseErrorMessage = ({ isShowingErrors }) => {
  return isShowingErrors ? (
    <EuiBadge className="eui-alignMiddle" color="danger">
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.editPolicy.phaseErrorMessage"
        defaultMessage="Fix errors"
      />
    </EuiBadge>
  ) : null;
};
