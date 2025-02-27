/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TransactionOptions } from '@elastic/apm-rum';
import { useKibana } from '../lib/kibana';

export type CasesApmTransactionName = `Cases [${string}] ${string}`;

interface StartTransactionOptions {
  type?: string;
  options?: TransactionOptions;
}

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = { managed: true };
const DEFAULT_TRANSACTION_TYPE = 'user-interaction';

export const useStartTransaction = () => {
  const { apm } = useKibana().services;

  const startTransaction = useCallback(
    (
      name: CasesApmTransactionName,
      {
        type = DEFAULT_TRANSACTION_TYPE,
        options = DEFAULT_TRANSACTION_OPTIONS,
      }: StartTransactionOptions = {}
    ) => apm?.startTransaction(name, type, options),
    [apm]
  );

  return { startTransaction };
};
