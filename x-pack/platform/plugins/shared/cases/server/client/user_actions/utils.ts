/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type {
  CaseUserActionDeprecatedResponse,
  CaseUserActionsDeprecatedResponse,
} from '../../../common/types/api';
import type {
  UserActionAttributes,
  UserActions,
  UserActionType,
} from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain';
import type { UserActionTransformedAttributes } from '../../common/types/user_actions';

export const extractAttributes = (
  userActions: SavedObjectsFindResponse<CaseUserActionDeprecatedResponse>
): CaseUserActionsDeprecatedResponse => {
  return userActions.saved_objects.map((so) => so.attributes);
};

export const formatSavedObject = (so: SavedObject<UserActionAttributes>) => ({
  id: so.id,
  version: so.version ?? '',
  ...so.attributes,
});

export const formatSavedObjects = (
  response: SavedObjectsFindResponse<UserActionAttributes>
): UserActions => response.saved_objects.map(formatSavedObject);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const extractAssigneeUids = (assignees: unknown): string[] => {
  if (!Array.isArray(assignees)) {
    return [];
  }

  return assignees
    .filter(
      (assignee): assignee is { uid: string } =>
        assignee != null && typeof assignee.uid === 'string'
    )
    .map((assignee) => assignee.uid);
};

const extractCustomFieldValues = (customFields: unknown): string[] => {
  if (!Array.isArray(customFields)) {
    return [];
  }

  return customFields
    .filter(
      (cf): cf is { type: string; value: string } =>
        cf != null && cf.type === 'text' && typeof cf.value === 'string'
    )
    .map((cf) => cf.value);
};

type SearchableContentExtractor = (payload: Record<string, unknown>) => string[];

const extractField =
  (field: string): SearchableContentExtractor =>
  (payload) => {
    const text = asString(payload[field]);
    return text ? [text] : [];
  };

const extractArrayField =
  (field: string): SearchableContentExtractor =>
  (payload) =>
    asStringArray(payload[field]);

const extractFileNames = (files: unknown): string[] => {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.flatMap((file) => {
    const name = asString((file as Record<string, unknown> | undefined)?.name);
    return name ? [name] : [];
  });
};

const extractCommentContent: SearchableContentExtractor = (payload) => {
  const comment = payload.comment as Record<string, unknown> | undefined;
  const texts: string[] = [];

  const legacyText = asString(comment?.comment);
  if (legacyText) texts.push(legacyText);

  const data = comment?.data as Record<string, unknown> | undefined;
  const content = asString(data?.content);
  if (content) texts.push(content);

  // Unified file attachments (`payload.comment.type: 'file'`).
  const metadata = comment?.metadata as Record<string, unknown> | undefined;
  texts.push(...extractFileNames(metadata?.files));

  // Legacy file attachments (`payload.comment.type: 'externalReference'`,
  // `externalReferenceAttachmentTypeId: '.files'`).
  const externalReferenceMetadata = comment?.externalReferenceMetadata as
    | Record<string, unknown>
    | undefined;
  texts.push(...extractFileNames(externalReferenceMetadata?.files));

  return texts;
};

const extractCustomFields: SearchableContentExtractor = (payload) =>
  extractCustomFieldValues(payload.customFields);

const extractAssignees: SearchableContentExtractor = (payload) =>
  extractAssigneeUids(payload.assignees);

const extractExtendedFields: SearchableContentExtractor = (payload) => {
  const extendedFields = payload.extended_fields;
  return extendedFields != null && typeof extendedFields === 'object'
    ? asStringArray(Object.values(extendedFields))
    : [];
};

const combineExtractors =
  (...extractors: SearchableContentExtractor[]): SearchableContentExtractor =>
  (payload) =>
    extractors.flatMap((extractor) => extractor(payload));

/**
 * Maps a user action type to the function that pulls its free-text-searchable
 * content out of the payload. Types not present here (e.g. `connector`,
 * `pushed`, `settings`, `status`, `observables`, `template`) either carry no
 * meaningful free text or only reference IDs, so they're excluded from search.
 *
 * `comment` also covers file attachments (both the unified `file` type and
 * the legacy `.files` externalReference type), whose file name(s) are
 * included via `extractCommentContent`.
 */
const SEARCHABLE_CONTENT_EXTRACTORS: Partial<Record<UserActionType, SearchableContentExtractor>> = {
  [UserActionTypes.comment]: extractCommentContent,
  [UserActionTypes.title]: extractField('title'),
  [UserActionTypes.description]: extractField('description'),
  [UserActionTypes.tags]: extractArrayField('tags'),
  [UserActionTypes.category]: extractField('category'),
  [UserActionTypes.severity]: extractField('severity'),
  [UserActionTypes.assignees]: extractAssignees,
  [UserActionTypes.customFields]: extractCustomFields,
  [UserActionTypes.extended_fields]: extractExtendedFields,
  [UserActionTypes.create_case]: combineExtractors(
    extractField('title'),
    extractField('description'),
    extractField('severity'),
    extractArrayField('tags'),
    extractCustomFields,
    extractAssignees
  ),
};

export const getSearchableContent = (attributes: UserActionTransformedAttributes): string[] => {
  const payload = attributes.payload as Record<string, unknown>;
  const extractor = SEARCHABLE_CONTENT_EXTRACTORS[attributes.type];
  return extractor ? extractor(payload) : [];
};

export const matchesSearch = (
  attributes: UserActionTransformedAttributes,
  search: string
): boolean => {
  if (!search) {
    return true;
  }

  const term = search.toLowerCase();

  const searchableTexts = getSearchableContent(attributes);
  if (searchableTexts.some((text) => text.toLowerCase().includes(term))) {
    return true;
  }

  const createdBy = attributes.created_by;
  if (createdBy) {
    const username = createdBy.username?.toLowerCase() ?? '';
    const fullName = createdBy.full_name?.toLowerCase() ?? '';

    if (username.includes(term) || fullName.includes(term)) {
      return true;
    }
  }

  return false;
};
