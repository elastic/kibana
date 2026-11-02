/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentResponse } from '../../../common/types/api';
import type { CasesWorkflowOperations } from '../../client/workflows/operations';
import type { DocumentPair } from './validate_origin';

const toPairKey = (id: string, index: string): string => `${id}|${index}`;

/**
 * Adds the concrete index of each attached alert that a selection names under an index other
 * than the one its attachment stores.
 *
 * Some attach paths (Attack Discovery, attacks) store the alerts alias as an alert's index, while
 * a selection carries the concrete `_index` of the hit. Only an attachment's own stored index is
 * searched for its id, so a selection still cannot claim an index its attachment does not reach.
 */
export const resolveAttachedAlertIndices = async ({
  selected,
  attached,
  resolveAlertIndices,
}: {
  selected: readonly DocumentPair[];
  attached: DocumentResponse;
  resolveAlertIndices: CasesWorkflowOperations['resolveAlertIndices'];
}): Promise<DocumentResponse> => {
  const attachedPairs = new Set(attached.map(({ id, index }) => toPairKey(id, index)));
  const unmatchedIds = new Set(
    selected
      .filter(({ _id, _index }) => !attachedPairs.has(toPairKey(_id, _index)))
      .map(({ _id }) => _id)
  );
  const unmatchedAttachments = attached.filter(({ id }) => unmatchedIds.has(id));
  if (unmatchedAttachments.length === 0) {
    return attached;
  }

  const attachmentsById = new Map(
    unmatchedAttachments.map((attachment) => [attachment.id, attachment])
  );
  const resolved = await resolveAlertIndices({
    alerts: unmatchedAttachments.map(({ id, index }) => ({ id, index })),
  });

  return [
    ...attached,
    ...resolved.flatMap(({ id, index }) => {
      const attachment = attachmentsById.get(id);
      return attachment !== undefined ? [{ ...attachment, index }] : [];
    }),
  ];
};
