/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { idx } from '@kbn/elastic-idx';
import { isRumAgentName } from '../../../../common/agent_name';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { HttpInfoSummaryItem } from './HttpInfoSummaryItem';
import { ResultSummaryItem } from './ResultSummaryItem';

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
    return <ResultSummaryItem result={result} />;
  }

  return null;
};

export { getTransactionResultSummaryItem };
