/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlDocument } from './types';

const SCHEME_SEPARATOR = '://';
const ID_SEPARATOR = ':';

export const smlOriginUri = (type: string, originId: string): string =>
  `${type}${SCHEME_SEPARATOR}${originId}`;

/** Entry id for an origin, `${type}:${originId}`. */
export const smlEntryId = (type: string, originId: string): string =>
  `${type}${ID_SEPARATOR}${originId}`;

export const smlEntryIdFromOriginUri = (originUri: string): string => {
  const separatorIndex = originUri.indexOf(SCHEME_SEPARATOR);
  return separatorIndex === -1
    ? originUri
    : smlEntryId(
        originUri.slice(0, separatorIndex),
        originUri.slice(separatorIndex + SCHEME_SEPARATOR.length)
      );
};

export const smlOriginUriFromEntryId = (entryId: string): string => {
  const separatorIndex = entryId.indexOf(ID_SEPARATOR);
  return separatorIndex === -1
    ? entryId
    : smlOriginUri(
        entryId.slice(0, separatorIndex),
        entryId.slice(separatorIndex + ID_SEPARATOR.length)
      );
};

/** The origin URI of an SML document: its `derived_from` reference. */
export const getSmlOriginUri = (doc: Pick<SmlDocument, 'references'>): string =>
  doc.references?.find((reference) => reference.relation === 'derived_from')?.uri ?? '';

/** Raw origin id (e.g. the saved object id) of an SML document, parsed out of its origin URI. */
export const getSmlOriginId = (doc: Pick<SmlDocument, 'references'>): string => {
  const uri = getSmlOriginUri(doc);
  const separatorIndex = uri.indexOf(SCHEME_SEPARATOR);
  return separatorIndex === -1 ? '' : uri.slice(separatorIndex + SCHEME_SEPARATOR.length);
};
