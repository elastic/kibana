/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { getMappedParams } from '../../../rules_client/common';
import { RawRule } from '../../../types';
import { createEsoMigration, pipeMigrations } from '../utils';

function addMappedParams(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: { params },
  } = doc;

  const mappedParams = getMappedParams(params);

  if (Object.keys(mappedParams).length) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        mapped_params: mappedParams,
      },
    };
  }

  return doc;
}

export const getMigrations820 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc: SavedObjectUnsanitizedDoc<RawRule>): doc is SavedObjectUnsanitizedDoc<RawRule> => true,
    pipeMigrations(addMappedParams)
  );
