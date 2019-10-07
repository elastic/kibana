/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isEmpty, set } from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { TRANSACTION_METADATA_SECTIONS } from './sections';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { MetadataTable } from '..';

interface Props {
  transaction: Transaction;
}

export function TransactionMetadata({ transaction }: Props) {
  let transactionCopy = {};
  if (!isEmpty(transaction)) {
    transactionCopy = {
      ...transaction,
      transaction: {
        id: transaction.transaction.id
      }
    };
    const custom = idx(transaction, _ => _.transaction.custom);
    if (custom) {
      set(transactionCopy, 'transaction.custom', custom);
    }
  }
  return (
    <MetadataTable
      item={transactionCopy}
      sections={TRANSACTION_METADATA_SECTIONS}
    />
  );
}
