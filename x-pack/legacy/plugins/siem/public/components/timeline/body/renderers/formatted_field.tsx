/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { isNumber } from 'lodash/fp';
import { EuiToolTip, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';

import { getOrEmptyTagFromValue } from '../../../empty_value';
import { FormattedDate } from '../../../formatted_date';
import { FormattedIp } from '../../../formatted_ip';
import { Port, PORT_NAMES } from '../../../port';

import { DATE_FIELD_TYPE, IP_FIELD_TYPE, MESSAGE_FIELD_NAME } from './constants';

export const FormattedFieldValue = pure<{
  eventId: string;
  contextId: string;
  fieldName: string;
  fieldType: string;
  value: string | number | undefined | null;
}>(({ eventId, contextId, fieldName, fieldType, value }) => {
  if (fieldType === IP_FIELD_TYPE) {
    return (
      <FormattedIp
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        value={!isNumber(value) ? value : String(value)}
      />
    );
  } else if (fieldType === DATE_FIELD_TYPE) {
    return <FormattedDate fieldName={fieldName} value={value} />;
  } else if (PORT_NAMES.some(portName => fieldName === portName)) {
    return (
      <Port contextId={contextId} eventId={eventId} fieldName={fieldName} value={`${value}`} />
    );
  } else if (fieldName === EVENT_DURATION_FIELD_NAME) {
    return (
      <Duration contextId={contextId} eventId={eventId} fieldName={fieldName} value={`${value}`} />
    );
  } else if (fieldName === MESSAGE_FIELD_NAME && value != null && value !== '') {
    return (
      <EuiToolTip
        position="left"
        data-test-subj="message-tool-tip"
        content={
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <span>{fieldName}</span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{value}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <>{value}</>
      </EuiToolTip>
    );
  } else {
    return getOrEmptyTagFromValue(value);
  }
});
