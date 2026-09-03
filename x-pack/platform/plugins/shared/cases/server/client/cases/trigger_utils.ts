/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Owner } from '../../../common/constants/types';
import type { Observable } from '../../../common/types/domain';
import type { ObservablesAddedEventPayload } from '../../events/types';
import type { CasesClientArgs } from '..';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

/** Emits the `cases.observablesAdded` event for the given newly-added observables. */
export const emitObservablesAddedEvent = (
  clientArgs: CasesClientArgs,
  theCase: CaseSavedObjectTransformed,
  observables: Observable[]
): void => {
  const payload: ObservablesAddedEventPayload = {
    caseId: theCase.id,
    owner: theCase.attributes.owner as Owner,
    // Ids in insertion order; type keys deduplicated and sorted.
    observableIds: observables.map(({ id }) => id),
    observableTypeKeys: [...new Set(observables.map(({ typeKey }) => typeKey))].sort(),
  };
  clientArgs.casesEventBus?.emitObservablesAdded(clientArgs.request, payload);
};
