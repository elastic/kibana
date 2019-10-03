/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { idx } from '@kbn/elastic-idx';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { Summary } from './';
import { TimestampSummaryItem } from './TimestampSummaryItem';
import { DurationSummaryItem } from './DurationSummaryItem';
import { ErrorCountSummaryItem } from './ErrorCountSummaryItem';
import { isRumAgentName } from '../../../../common/agent_name';
import { HttpInfoSummaryItem } from './HttpInfoSummaryItem';
import { TransactionResultSummaryItem } from './TransactionResultSummaryItem';

interface Props {
  transaction: Transaction;
  totalDuration: number | undefined;
  errorCount: number;
}

const getTransactionResultSummaryItem = (transaction: Transaction) => {
  const result = idx(transaction, _ => _.transaction.result);
  const isRumAgent = isRumAgentName(transaction.agent.name);
  const url = isRumAgent
    ? idx(transaction, _ => _.transaction.page.url)
    : idx(transaction, _ => _.url.full);

  if (url) {
    const method = idx(transaction, _ => _.http.request.method) || '';
    const status = idx(transaction, _ => _.http.response.status_code);

    return <HttpInfoSummaryItem method={method} status={status} url={url} />;
  }

  if (result) {
    return <TransactionResultSummaryItem transactionResult={result} />;
  }

  return null;
};

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
  ];

  return <Summary items={items}></Summary>;
};

export { TransactionSummary };
