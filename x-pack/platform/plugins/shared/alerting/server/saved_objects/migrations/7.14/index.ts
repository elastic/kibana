/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { RawRule } from '../../../types';
import { createEsoMigration, isSiemSignalsRuleType, pipeMigrations } from '../utils';

/**
 * The author field was introduced later and was not part of the original rules. We overlooked
 * the filling in the author field as an empty array in an earlier upgrade routine from
 * 'removeNullsFromSecurityRules' during the 7.13.0 upgrade. Since we don't change earlier migrations,
 * but rather only move forward with the "arrow of time" we are going to upgrade and fix
 * it if it is missing for anyone in 7.14.0 and above release. Earlier releases if we want to fix them,
 * would have to be modified as a "7.13.1", etc... if we want to fix it there.
 * @param doc The document that is not migrated and contains a "null" or "undefined" author field
 * @returns The document with the author field fleshed in.
 */
function removeNullAuthorFromSecurityRules(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { params },
  } = doc;
  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      params: {
        ...params,
        author: params.author != null ? params.author : [],
      },
    },
  };
}

export const getMigrations7140 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isSiemSignalsRuleType(doc),
    pipeMigrations(removeNullAuthorFromSecurityRules)
  );
