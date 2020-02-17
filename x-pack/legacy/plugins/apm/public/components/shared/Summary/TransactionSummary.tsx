/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { Summary } from './';
import { TimestampTooltip } from '../TimestampTooltip';
import { DurationSummaryItem } from './DurationSummaryItem';
import { ErrorCountSummaryItemBadge } from './ErrorCountSummaryItemBadge';
import { isRumAgentName } from '../../../../common/agent_name';
import { HttpInfoSummaryItem } from './HttpInfoSummaryItem';
import { TransactionResultSummaryItem } from './TransactionResultSummaryItem';
import { UserAgentSummaryItem } from './UserAgentSummaryItem';

interface Props {
  transaction: Transaction;
  totalDuration: number | undefined;
  errorCount: number;
}

const getTransactionResultSummaryItem = (transaction: Transaction) => {
  const result = transaction.transaction.result;
  const isRumAgent = isRumAgentName(transaction.agent.name);
  const url = isRumAgent
    ? transaction.transaction.page?.url
    : transaction.url?.full;

  if (url) {
    const method = transaction.http?.request?.method;
    const status = transaction.http?.response?.status_code;

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
    <TimestampTooltip time={transaction.timestamp.us / 1000} />,
    <DurationSummaryItem
      duration={transaction.transaction.duration.us}
      totalDuration={totalDuration}
      parentType="trace"
    />,
    getTransactionResultSummaryItem(transaction),
    errorCount ? <ErrorCountSummaryItemBadge count={errorCount} /> : null,
    transaction.user_agent ? (
      <UserAgentSummaryItem {...transaction.user_agent} />
    ) : null
  ];

  return <Summary items={items} />;
};

export { TransactionSummary };
