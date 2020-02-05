/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
export const ActiveBadge = () => {
  return (
    <EuiBadge className="eui-alignMiddle">
      <FormattedMessage id="xpack.indexLifecycleMgmt.activePhaseMessage" defaultMessage="Active" />
    </EuiBadge>
  );
};
