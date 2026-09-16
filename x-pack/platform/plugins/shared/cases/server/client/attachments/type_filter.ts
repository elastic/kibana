/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { AttachmentType } from '../../../common';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import {
  UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP,
  PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP,
} from '../../../common/constants/attachments';
import {
  toLegacyAttachmentType,
  toLegacyPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../utils';

/**
 * Builds the `cases-comments` + `cases-attachments` type filter for `find`. `types`
 * are unified type strings only; omitted means every type. Legacy SOs store the old
 * vocabulary, so each unified type still maps to its legacy equivalent.
 */
export const buildAttachmentTypeFilter = (types: string[] | undefined): KueryNode | undefined => {
  if (!types || types.length === 0) {
    return undefined;
  }

  const unifiedTypes = new Set<string>();
  const legacyTypes = new Set<string>();
  // externalReference/persistableState share one legacy SO-level `type` bucket across
  // several unified subtypes, so matching one subtype also needs its nested id field.
  const legacyExternalReferenceIds = new Set<string>();
  const legacyPersistableStateIds = new Set<string>();

  for (const type of types) {
    unifiedTypes.add(type);

    if (type in PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP) {
      legacyPersistableStateIds.add(toLegacyPersistableStateAttachmentType(type));
    } else {
      const legacyBucket = toLegacyAttachmentType(type);
      if (legacyBucket === AttachmentType.externalReference) {
        legacyExternalReferenceIds.add(UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP[type]);
      } else if (legacyBucket && legacyBucket !== type) {
        legacyTypes.add(legacyBucket);
      }
    }
    // Otherwise unified-only (e.g. `security.entity`, `dashboard`) — no legacy form.
  }

  const legacySubtypeFilter = (bucketType: string, idField: string, ids: Set<string>) =>
    ids.size === 0
      ? undefined
      : combineFilters(
          [
            buildFilter({
              filters: [bucketType],
              field: 'type',
              operator: 'or',
              type: CASE_COMMENT_SAVED_OBJECT,
            }),
            buildFilter({
              filters: [...ids],
              field: idField,
              operator: 'or',
              type: CASE_COMMENT_SAVED_OBJECT,
            }),
          ],
          NodeBuilderOperators.and
        );

  const legacyFilter = combineFilters(
    [
      buildFilter({
        filters: [...legacyTypes],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
      legacySubtypeFilter(
        AttachmentType.externalReference,
        'externalReferenceAttachmentTypeId',
        legacyExternalReferenceIds
      ),
      legacySubtypeFilter(
        AttachmentType.persistableState,
        'persistableStateAttachmentTypeId',
        legacyPersistableStateIds
      ),
    ],
    NodeBuilderOperators.or
  );

  const unifiedFilter = buildFilter({
    filters: [...unifiedTypes],
    field: 'type',
    operator: 'or',
    type: CASE_ATTACHMENT_SAVED_OBJECT,
  });

  return combineFilters([legacyFilter, unifiedFilter], NodeBuilderOperators.or);
};
