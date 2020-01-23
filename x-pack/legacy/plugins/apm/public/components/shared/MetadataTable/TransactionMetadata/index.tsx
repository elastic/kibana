/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { TRANSACTION_METADATA_SECTIONS } from './sections';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { getSectionsWithRows } from '../helper';
import { MetadataTable } from '..';

interface Props {
  transaction: Transaction;
}

export function TransactionMetadata({ transaction }: Props) {
  const sectionsWithRows = useMemo(
    () => getSectionsWithRows(TRANSACTION_METADATA_SECTIONS, transaction),
    [transaction]
  );
  return <MetadataTable sections={sectionsWithRows} />;
}
