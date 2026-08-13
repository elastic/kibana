/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsUpdateResponse,
  SavedObject,
  SavedObjectReference,
} from '@kbn/core/server';
import { isEqual, uniqWith } from 'lodash';
import type {
  AttachmentAttributesV2,
  AttachmentAttributesNoSO,
  AttachmentPatchAttributesV2,
} from '../../common/types/domain';
import { EXTERNAL_REFERENCE_REF_NAME, ATTACHMENT_ID_REF_NAME } from '../common/constants';
import type {
  AttachmentPersistedAttributes,
  AttachmentRequestAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../common/types/attachments_v1';
import {
  isCommentRequestTypeExternalReferenceSO,
  isUnifiedAttachmentWithSoReference,
} from './type_guards';
import { SOReferenceExtractor } from './so_reference_extractor';
import type { OptionalAttributes } from './types';

/**
 * Write-side / legacy read-side extractor: emits ONLY the legacy
 * `externalReferenceId` field. The unified flow mirrors `attachmentId`
 * separately via {@link buildUnifiedAttachmentSORefs} and keeps the
 * attribute in place. For the unified-aware read-side use
 * {@link getAttachmentInjectSOExtractor}.
 */
export const getAttachmentSOExtractor = (
  attachment: Partial<AttachmentRequestAttributes>
): SOReferenceExtractor => {
  const fieldsToExtract = [];

  if (isCommentRequestTypeExternalReferenceSO(attachment)) {
    fieldsToExtract.push({
      path: 'externalReferenceId',
      type: attachment.externalReferenceStorage.soType,
      name: EXTERNAL_REFERENCE_REF_NAME,
    });
  }

  return new SOReferenceExtractor(fieldsToExtract);
};

/**
 * Unified-aware read-side extractor. Restores the legacy
 * `externalReferenceId` field and, for unified SO-backed payloads
 * (those carrying `metadata.soType`), also restores `attachmentId` from
 * references. Self-heals rows persisted before unified writes kept the
 * attribute in place; for new rows the inject is a no-op.
 */
export const getAttachmentInjectSOExtractor = (
  attachment: Partial<AttachmentRequestAttributes>
): SOReferenceExtractor => {
  const fieldsToExtract = [];

  if (isCommentRequestTypeExternalReferenceSO(attachment)) {
    fieldsToExtract.push({
      path: 'externalReferenceId',
      type: attachment.externalReferenceStorage.soType,
      name: EXTERNAL_REFERENCE_REF_NAME,
    });
  } else if (isUnifiedAttachmentWithSoReference(attachment)) {
    fieldsToExtract.push({
      path: 'attachmentId',
      type: attachment.metadata.soType,
      name: ATTACHMENT_ID_REF_NAME,
    });
  }

  return new SOReferenceExtractor(fieldsToExtract);
};

/**
 * Mirrors `attachmentId` into `references` for SO-backed unified attachments
 * (those carrying `metadata.soType`) so SO export/import and `hasReference`
 * queries see the dependency. The attribute is intentionally kept in place so
 * read paths can consume it directly. Returns `[]` for non-SO-backed payloads
 * or when `attachmentId` is missing / not a single id string.
 */
export const buildUnifiedAttachmentSORefs = (
  attachment: Partial<AttachmentRequestAttributes> | Record<string, unknown>
): SavedObjectReference[] => {
  if (!isUnifiedAttachmentWithSoReference(attachment)) {
    return [];
  }
  const { attachmentId } = attachment;
  if (typeof attachmentId !== 'string' || attachmentId.length === 0) {
    return [];
  }
  return [
    {
      id: attachmentId,
      name: ATTACHMENT_ID_REF_NAME,
      type: attachment.metadata.soType,
    },
  ];
};

/**
 * Read-side inject for `bulkGet` results where `attributes` may be undefined
 * when the SO was not found. Restores `externalReferenceId` (legacy) and, for
 * unified SO-backed payloads, `attachmentId`.
 */
export const injectAttachmentAttributesAndHandleErrors = (
  savedObject: OptionalAttributes<AttachmentPersistedAttributes>
): OptionalAttributes<AttachmentTransformedAttributes> => {
  if (!hasAttributes(savedObject)) {
    // we don't actually have an attributes field here so the type doesn't matter, this cast is to get the types to stop
    // complaining though
    return savedObject as OptionalAttributes<AttachmentTransformedAttributes>;
  }

  return injectAttachmentSOAttributesFromRefs(savedObject);
};

const hasAttributes = <T>(savedObject: OptionalAttributes<T>): savedObject is SavedObject<T> => {
  return savedObject.error == null && savedObject.attributes != null;
};

/**
 * Read-side inject. Restores `externalReferenceId` (legacy) and `attachmentId`
 * (unified SO-backed payloads with `metadata.soType`). Safe to use for both
 * legacy and unified SOs.
 */
export const injectAttachmentSOAttributesFromRefs = (
  savedObject: SavedObject<AttachmentPersistedAttributes>
): AttachmentSavedObjectTransformed => {
  const soExtractor = getAttachmentInjectSOExtractor(savedObject.attributes);
  return soExtractor.populateFieldsFromReferences<AttachmentTransformedAttributes>(savedObject);
};

/** Patch-flow variant of {@link injectAttachmentSOAttributesFromRefs}. */
export const injectAttachmentSOAttributesFromRefsForPatch = (
  updatedAttributes: AttachmentPatchAttributesV2,
  savedObject: SavedObjectsUpdateResponse<AttachmentPersistedAttributes>
): SavedObjectsUpdateResponse<AttachmentTransformedAttributes> => {
  const soExtractor = getAttachmentInjectSOExtractor(savedObject.attributes);
  return soExtractor.populateFieldsFromReferencesForPatch<AttachmentTransformedAttributes>({
    dataBeforeRequest: updatedAttributes,
    dataReturnedFromRequest: savedObject,
  }) as SavedObjectsUpdateResponse<AttachmentTransformedAttributes>;
};

interface ExtractionResults {
  attributes: AttachmentPersistedAttributes;
  references: SavedObjectReference[];
  didDeleteOperation: boolean;
}

export const extractAttachmentSORefsFromAttributes = (
  attributes: AttachmentAttributesV2 | AttachmentPatchAttributesV2,
  references: SavedObjectReference[]
): ExtractionResults => {
  const soExtractor = getAttachmentSOExtractor(attributes);

  const {
    transformedFields,
    references: refsWithExternalRefId,
    didDeleteOperation,
  } = soExtractor.extractFieldsToReferences<AttachmentAttributesNoSO>({
    data: attributes,
    existingReferences: references,
  });

  // Unified SO-backed payloads keep `attachmentId` on attributes; we only
  // mirror it into references so SO export/import sees the dependency.
  const unifiedReferences = buildUnifiedAttachmentSORefs(attributes);

  return {
    attributes: transformedFields,
    references: getUniqueReferences([...refsWithExternalRefId, ...unifiedReferences]),
    didDeleteOperation,
  };
};

export const getUniqueReferences = (references: SavedObjectReference[]): SavedObjectReference[] =>
  uniqWith(references, isEqual);
