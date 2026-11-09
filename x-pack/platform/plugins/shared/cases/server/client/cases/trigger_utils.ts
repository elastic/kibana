/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { Owner } from '../../../common/constants/types';
import type { Observable } from '../../../common/types/domain';
import type { ObservablesAddedEventPayload } from '../../events/types';
import type { CasesClientArgs } from '..';
import type { CaseSavedObjectTransformed } from '../../common/types/case';

/**
 * Emits the `cases.observablesAdded` event for the given newly-added observables. The trigger
 * schema accepts at most 50 ids, so an add of more carries its first 50.
 */
export const emitObservablesAddedEvent = (
  clientArgs: CasesClientArgs,
  theCase: CaseSavedObjectTransformed,
  addedObservables: Observable[]
): void => {
  const observables = addedObservables.slice(0, MAX_OBSERVABLES_PER_CASE);
  const payload: ObservablesAddedEventPayload = {
    caseId: theCase.id,
    owner: theCase.attributes.owner as Owner,
    // Both arrays are index-aligned: observableTypeKeys[i] is the type of observableIds[i].
    observableIds: observables.map(({ id }) => id),
    observableTypeKeys: observables.map(({ typeKey }) => typeKey),
  };
  clientArgs.casesEventBus?.emitObservablesAdded(clientArgs.request, payload);
};
