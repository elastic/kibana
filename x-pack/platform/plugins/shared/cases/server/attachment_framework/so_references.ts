/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { AttachmentRequest } from '../../common/types/api';
import type { PersistableStateAttachmentPayload } from '../../common/types/domain';
import { isCommentRequestTypePersistableState } from '../../common/utils/attachments';
import type { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';

interface SavedObjectAttributesAndReferences {
  state: PersistableStateAttachmentPayload;
  references: SavedObjectReference[];
}

interface ExtractDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

type InjectDeps = ExtractDeps;

export function extractPersistableStateReferences(
  state: PersistableStateAttachmentPayload,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {
  const { persistableStateAttachmentState, persistableStateAttachmentTypeId } = state;

  if (!deps.persistableStateAttachmentTypeRegistry.has(persistableStateAttachmentTypeId)) {
    return { state, references: [] };
  }

  const attachment = deps.persistableStateAttachmentTypeRegistry.get(
    persistableStateAttachmentTypeId
  );

  const { state: extractedState, references: extractedReferences } = attachment.extract({
    persistableStateAttachmentState,
    persistableStateAttachmentTypeId,
  });

  return {
    state: { ...state, ...extractedState, persistableStateAttachmentTypeId },
    references: extractedReferences,
  };
}

export function injectPersistableReferences(
  { state, references = [] }: SavedObjectAttributesAndReferences,
  deps: InjectDeps
): PersistableStateAttachmentPayload {
  const { persistableStateAttachmentState, persistableStateAttachmentTypeId } = state;

  if (!deps.persistableStateAttachmentTypeRegistry.has(persistableStateAttachmentTypeId)) {
    return state;
  }

  const attachment = deps.persistableStateAttachmentTypeRegistry.get(
    persistableStateAttachmentTypeId
  );

  const injectedState = attachment.inject(
    {
      persistableStateAttachmentState,
      persistableStateAttachmentTypeId,
    },
    references
  );

  return { ...state, ...injectedState, persistableStateAttachmentTypeId };
}

export const extractPersistableStateReferencesFromSO = <T extends AttachmentRequest>(
  attachmentAttributes: T,
  deps: ExtractDeps
) => {
  let attributes = { ...attachmentAttributes };
  let references: SavedObjectReference[] = [];

  if (isCommentRequestTypePersistableState(attachmentAttributes)) {
    const { state, references: extractedReferences } = extractPersistableStateReferences(
      attachmentAttributes,
      deps
    );

    references = [...references, ...extractedReferences];
    attributes = { ...attributes, ...state };
  }

  return { attributes, references };
};

export const injectPersistableReferencesToSO = <T extends Partial<AttachmentRequest>>(
  attachmentAttributes: T,
  references: SavedObjectReference[],
  deps: InjectDeps
) => {
  if (isCommentRequestTypePersistableState(attachmentAttributes)) {
    const injectedState = injectPersistableReferences(
      {
        state: attachmentAttributes,
        references,
      },
      deps
    );

    return { ...attachmentAttributes, ...injectedState };
  }

  return attachmentAttributes;
};
