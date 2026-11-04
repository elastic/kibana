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
 * payload carries at most `MAX_OBSERVABLES_PER_CASE` ids, so larger adds send the first ones.
 */
export const emitObservablesAddedEvent = (
  clientArgs: CasesClientArgs,
  theCase: CaseSavedObjectTransformed,
  observables: Observable[]
): void => {
  const firstObservables = observables.slice(0, MAX_OBSERVABLES_PER_CASE);
  const payload: ObservablesAddedEventPayload = {
    caseId: theCase.id,
    owner: theCase.attributes.owner as Owner,
    // Both arrays are index-aligned: observableTypeKeys[i] is the type of observableIds[i].
    observableIds: firstObservables.map(({ id }) => id),
    observableTypeKeys: firstObservables.map(({ typeKey }) => typeKey),
  };
  clientArgs.casesEventBus?.emitObservablesAdded(clientArgs.request, payload);
};
