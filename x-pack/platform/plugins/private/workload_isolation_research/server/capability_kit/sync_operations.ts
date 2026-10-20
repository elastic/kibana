/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Binding } from './host';
import type { Bundle } from './protocol';
import type { CodecInput } from './codecs';

/** Allowlisting is explicit; these operations must be pure, bounded, synchronous and free of I/O. */
export const bindSyncOperations = (
  operations: Readonly<Record<string, (args: CodecInput, bundle: Bundle) => CodecInput>>
): Binding => {
  const invoke = (operation: string, args: CodecInput, bundle: Bundle): CodecInput => {
    if (!Object.hasOwn(operations, operation)) throw new Error('Sync operation not allowlisted');
    return operations[operation](args, bundle);
  };
  return {
    lever: 'capability_bundle',
    handler: async (operation, args, bundle) => invoke(operation, args, bundle),
    syncHandler: invoke,
  };
};
