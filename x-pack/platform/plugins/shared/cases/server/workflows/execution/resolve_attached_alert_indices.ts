/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentResponse } from '../../../common/types/api';
import type { CasesWorkflowOperations } from '../../client/workflows/operations';
import type { AlertIndexClaim } from '../../common/types';
import type { DocumentPair } from './validate_origin';

const toPairKey = (id: string, index: string): string => `${id}|${index}`;

/**
 * Adds the index a selection names for an attached alert when the alert's stored index reaches
 * it, even though the two differ.
 *
 * Some attach paths (Attack Discovery, attacks) store the alerts alias as an alert's index, while
 * a selection carries the concrete `_index` of the hit. Only an attachment's own stored index is
 * searched, for exactly the selected pair, so a selection still cannot claim an index its
 * attachment does not reach.
 */
export const resolveAttachedAlertIndices = async ({
  selected,
  attached,
  confirmAlertIndices,
}: {
  selected: readonly DocumentPair[];
  attached: DocumentResponse;
  confirmAlertIndices: CasesWorkflowOperations['confirmAlertIndices'];
}): Promise<DocumentResponse> => {
  const attachedPairs = new Set(attached.map(({ id, index }) => toPairKey(id, index)));
  const claims: AlertIndexClaim[] = selected
    .filter(({ _id, _index }) => !attachedPairs.has(toPairKey(_id, _index)))
    .flatMap(({ _id, _index }) =>
      attached
        .filter(({ id }) => id === _id)
        .map(({ index: attachedIndex }) => ({ id: _id, index: _index, attachedIndex }))
    );
  if (claims.length === 0) {
    return attached;
  }

  const confirmedIndicesByAttachment = new Map<string, Set<string>>();
  for (const { id, index, attachedIndex } of await confirmAlertIndices({ claims })) {
    const key = toPairKey(id, attachedIndex);
    const indices = confirmedIndicesByAttachment.get(key) ?? new Set<string>();
    indices.add(index);
    confirmedIndicesByAttachment.set(key, indices);
  }

  // Each confirmed index is added through the attachment whose stored index reached it.
  return [
    ...attached,
    ...attached.flatMap((attachment) =>
      Array.from(
        confirmedIndicesByAttachment.get(toPairKey(attachment.id, attachment.index)) ?? [],
        (index) => ({ ...attachment, index })
      )
    ),
  ];
};
