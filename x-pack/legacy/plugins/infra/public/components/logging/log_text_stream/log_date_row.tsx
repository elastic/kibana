/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { localizedDate } from '../../../utils/formatters/datetime';

interface LogDateRowProps {
  timestamp: number;
}

/**
 * Show a row with the date in the log stream
 */
export const LogDateRow: React.FC<LogDateRowProps> = ({ timestamp }) => {
  const formattedDate = localizedDate(timestamp);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h2 style={{ paddingLeft: 8 }}>{formattedDate}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
