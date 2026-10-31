/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservableSource } from '../../services/observables';
import type { CasesClientSource } from '../types';

/** Maps the origin of a cases client to how the observable is recorded in the observables index. */
export const getObservableSource = (clientSource: CasesClientSource): ObservableSource => {
  switch (clientSource) {
    case 'workflow':
      return 'workflow';
    case 'agent_builder':
      return 'agent';
    default:
      return 'api';
  }
};

/**
 * Mirrors an observable change to the observables index while the case field is still the source of
 * truth. A failed mirror never fails the request: it is logged and the returned attributes flag the
 * case as out of sync, to be merged into the case update that carries the change itself.
 */
export const mirrorToObservablesIndex = async ({
  caseId,
  logger,
  write,
}: {
  caseId: string;
  logger: Logger;
  write: () => Promise<void>;
}): Promise<{ observables_sync_pending?: true }> => {
  try {
    await write();
    return {};
  } catch (error) {
    logger.error(
      `[observables] Failed to write the observables of case ${caseId} to the observables index; the case is flagged as pending sync. Error: ${error}`,
      { error: { stack_trace: error instanceof Error ? error.stack : undefined } }
    );
    return { observables_sync_pending: true };
  }
};
