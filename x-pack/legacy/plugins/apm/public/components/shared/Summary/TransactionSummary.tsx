/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { Summary } from './';
import { TimestampSummaryItem } from './TimestampSummaryItem';
import { DurationSummaryItem } from './DurationSummaryItem';
import { getTransactionResultSummaryItem } from './getTransactionResultSummaryItem';
import { ErrorCountSummaryItem } from './ErrorCountSummaryItem';

interface Props {
  transaction: Transaction;
  totalDuration: number | undefined;
  errorCount: number;
}

const TransactionSummary = ({
  transaction,
  totalDuration,
  errorCount
}: Props) => {
  const items = [
    <TimestampSummaryItem time={transaction.timestamp.us / 1000} />,
    <DurationSummaryItem
      duration={transaction.transaction.duration.us}
      totalDuration={totalDuration}
      parentType="trace"
    />,
    getTransactionResultSummaryItem(transaction),
    errorCount ? <ErrorCountSummaryItem count={errorCount} /> : null
  ].filter(Boolean) as React.ReactElement[];

  return <Summary items={items}></Summary>;
};

export { TransactionSummary };
