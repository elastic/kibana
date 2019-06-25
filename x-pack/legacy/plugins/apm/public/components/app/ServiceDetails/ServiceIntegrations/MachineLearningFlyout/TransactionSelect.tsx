/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiText
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface TransactionSelectProps {
  transactionTypes: string[];
  onChange: (value: string) => void;
  selectedTransactionType: string;
}

export function TransactionSelect({
  transactionTypes,
  onChange,
  selectedTransactionType
}: TransactionSelectProps) {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.selectTransactionTypeLabel',
        {
          defaultMessage: 'Select a transaction type for this job'
        }
      )}
    >
      <EuiSuperSelect
        valueOfSelected={selectedTransactionType}
        onChange={onChange}
        options={transactionTypes.map(transactionType => {
          return {
            value: transactionType,
            inputDisplay: transactionType,
            dropdownDisplay: (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiText>{transactionType}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )
          };
        })}
      />
    </EuiFormRow>
  );
}
