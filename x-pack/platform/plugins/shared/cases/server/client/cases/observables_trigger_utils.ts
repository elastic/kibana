/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import type { Observable } from '../../../common/types/domain';
import type { CasesClientArgs } from '..';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

/** Emits the `cases.observablesAdded` event for the given newly-added observables. */
export function emitObservablesAddedEvent(
  clientArgs: CasesClientArgs,
  theCase: CaseSavedObjectTransformed,
  observables: Observable[]
): void {
  clientArgs.casesEventBus?.emitObservablesAdded(clientArgs.request, {
    caseId: theCase.id,
    owner: theCase.attributes.owner as Owner,
    observables: observables.map(({ id, typeKey, value, description }) => ({
      id,
      typeKey,
      value,
      description: description ?? null,
    })),
  });
}
