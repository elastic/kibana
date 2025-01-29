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
  AttachmentAttributes,
  AttachmentAttributesNoSO,
  AttachmentPatchAttributes,
} from '../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import {
  injectPersistableReferencesToSO,
  extractPersistableStateReferencesFromSO,
} from '../attachment_framework/so_references';
import { EXTERNAL_REFERENCE_REF_NAME } from '../common/constants';
import type {
  AttachmentPersistedAttributes,
  AttachmentRequestAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../common/types/attachments';
import { isCommentRequestTypeExternalReferenceSO } from './type_guards';
import { SOReferenceExtractor } from './so_reference_extractor';
import type { OptionalAttributes } from './types';

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
 * This function should be used when the attributes field could be undefined. Specifically when
 * performing a bulkGet within the core saved object library. If one of the requested ids does not exist in elasticsearch
 * then the error field will be set and attributes will be undefined.
 */
export const injectAttachmentAttributesAndHandleErrors = (
  savedObject: OptionalAttributes<AttachmentPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): OptionalAttributes<AttachmentTransformedAttributes> => {
  if (!hasAttributes(savedObject)) {
    // we don't actually have an attributes field here so the type doesn't matter, this cast is to get the types to stop
    // complaining though
    return savedObject as OptionalAttributes<AttachmentTransformedAttributes>;
  }

  return injectAttachmentSOAttributesFromRefs(savedObject, persistableStateAttachmentTypeRegistry);
};

const hasAttributes = <T>(savedObject: OptionalAttributes<T>): savedObject is SavedObject<T> => {
  return savedObject.error == null && savedObject.attributes != null;
};

export const injectAttachmentSOAttributesFromRefs = (
  savedObject: SavedObject<AttachmentPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): AttachmentSavedObjectTransformed => {
  const soExtractor = getAttachmentSOExtractor(savedObject.attributes);
  const so = soExtractor.populateFieldsFromReferences<AttachmentTransformedAttributes>(savedObject);
  const injectedAttributes = injectPersistableReferencesToSO(so.attributes, so.references, {
    persistableStateAttachmentTypeRegistry,
  });

  return { ...so, attributes: { ...so.attributes, ...injectedAttributes } };
};

export const injectAttachmentSOAttributesFromRefsForPatch = (
  updatedAttributes: AttachmentPatchAttributes,
  savedObject: SavedObjectsUpdateResponse<AttachmentPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObjectsUpdateResponse<AttachmentTransformedAttributes> => {
  const soExtractor = getAttachmentSOExtractor(savedObject.attributes);
  const so = soExtractor.populateFieldsFromReferencesForPatch<AttachmentTransformedAttributes>({
    dataBeforeRequest: updatedAttributes,
    dataReturnedFromRequest: savedObject,
  });

  /**
   *  We don't allow partial updates of attachments attributes.
   * Consumers will always get state of the attachment.
   */
  const injectedAttributes = injectPersistableReferencesToSO(so.attributes, so.references ?? [], {
    persistableStateAttachmentTypeRegistry,
  });

  return {
    ...so,
    attributes: { ...so.attributes, ...injectedAttributes },
  } as SavedObjectsUpdateResponse<AttachmentTransformedAttributes>;
};

interface ExtractionResults {
  attributes: AttachmentPersistedAttributes;
  references: SavedObjectReference[];
  didDeleteOperation: boolean;
}

export const extractAttachmentSORefsFromAttributes = (
  attributes: AttachmentAttributes | AttachmentPatchAttributes,
  references: SavedObjectReference[],
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
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

  const { attributes: extractedAttributes, references: extractedReferences } =
    extractPersistableStateReferencesFromSO(transformedFields, {
      persistableStateAttachmentTypeRegistry,
    });

  return {
    attributes: { ...transformedFields, ...extractedAttributes },
    references: getUniqueReferences([...refsWithExternalRefId, ...extractedReferences]),
    didDeleteOperation,
  };
};

export const getUniqueReferences = (references: SavedObjectReference[]): SavedObjectReference[] =>
  uniqWith(references, isEqual);
