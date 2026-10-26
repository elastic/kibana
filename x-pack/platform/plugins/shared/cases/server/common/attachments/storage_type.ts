/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import type { ExternalReferenceAttachmentPayload } from '../../../common/types/domain';
import { ExternalReferenceStorageType } from '../../../common/types/domain';
import { LEGACY_FILE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

type ExternalReferenceStorage = ExternalReferenceAttachmentPayload['externalReferenceStorage'];

/**
 * Resolves the legacy `externalReferenceStorage` that should be emitted when
 * converting a unified attachment back to its legacy external-reference shape.
 *
 * The map is keyed by the legacy `externalReferenceAttachmentTypeId` so both
 * directions of the transformer can share the same source of truth.
 */
const EXTERNAL_REFERENCE_STORAGE_BY_TYPE_ID: Record<string, ExternalReferenceStorage> = {
  endpoint: { type: ExternalReferenceStorageType.elasticSearchDoc },
  [LEGACY_FILE_ATTACHMENT_TYPE]: {
    type: ExternalReferenceStorageType.savedObject,
    soType: FILE_SO_TYPE,
  },
};

/**
 * Returns the `externalReferenceStorage` to write for a legacy type id.
 * Defaults to `elasticSearchDoc` for types that have not declared a mapping.
 */
export function getExternalReferenceStorage(
  externalReferenceAttachmentTypeId: string
): ExternalReferenceStorage {
  return (
    EXTERNAL_REFERENCE_STORAGE_BY_TYPE_ID[externalReferenceAttachmentTypeId] ?? {
      type: ExternalReferenceStorageType.elasticSearchDoc,
    }
  );
}

/**
 * Returns true when the legacy type id is known to persist via `savedObject`
 * storage. Callers converting legacy → unified can use this to extract the
 * `soType` into `metadata` so nothing is lost in the round-trip.
 */
export function isSavedObjectBackedExternalReference(
  externalReferenceAttachmentTypeId: string
): boolean {
  const storage = EXTERNAL_REFERENCE_STORAGE_BY_TYPE_ID[externalReferenceAttachmentTypeId];
  return storage?.type === ExternalReferenceStorageType.savedObject;
}
