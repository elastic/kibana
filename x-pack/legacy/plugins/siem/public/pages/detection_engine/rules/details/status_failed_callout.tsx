/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';

import { FormattedDate } from '../../../../components/formatted_date';
import * as i18n from './translations';

interface RuleStatusFailedCallOutComponentProps {
  date: string;
  message: string;
}

const RuleStatusFailedCallOutComponent: React.FC<RuleStatusFailedCallOutComponentProps> = ({
  date,
  message,
}) => (
  <EuiCallOut
    title={
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexStart">
        <EuiFlexItem grow={false}>{i18n.ERROR_CALLOUT_TITLE}</EuiFlexItem>
        <EuiFlexItem grow={true}>
          <FormattedDate value={date} fieldName="last_failure_at" />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
    color="danger"
    iconType="alert"
  >
    <p>{message}</p>
  </EuiCallOut>
);

export const RuleStatusFailedCallOut = memo(RuleStatusFailedCallOutComponent);
