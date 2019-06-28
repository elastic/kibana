/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { APMLink } from './APMLink';
import { legacyEncodeURIComponent } from './url_helpers';

interface TransactionLinkProps {
  transaction?: Transaction;
}

export const TransactionLink: React.SFC<TransactionLinkProps> = ({
  transaction,
  children
}) => {
  if (!transaction) {
    return null;
  }

  const serviceName = transaction.service.name;
  const transactionType = legacyEncodeURIComponent(
    transaction.transaction.type
  );
  const traceId = transaction.trace.id;
  const transactionId = transaction.transaction.id;
  const name = transaction.transaction.name;
  const encodedName = legacyEncodeURIComponent(name);

  return (
    <APMLink
      path={`/${serviceName}/transactions/${transactionType}/${encodedName}`}
      query={{ traceId, transactionId }}
    >
      {children}
    </APMLink>
  );
};
