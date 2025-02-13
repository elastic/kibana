/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
} from '@kbn/core-saved-objects-server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { isString } from 'lodash/fp';
import { RawRule } from '../../../types';
import { createEsoMigration, isSiemSignalsRuleType, pipeMigrations } from '../utils';

/**
 * This will do a flatMap reduce where we only return exceptionsLists and their items if:
 *   - exceptionLists are an array and not null, undefined, or malformed data.
 *   - The exceptionList item is an object and id is a string and not null, undefined, or malformed data
 *
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc...
 * @param exceptionsList The list of exceptions
 * @returns The exception lists if they are a valid enough shape
 */
function removeMalformedExceptionsList(
  exceptionsList: SavedObjectAttribute
): SavedObjectAttributes[] {
  if (!Array.isArray(exceptionsList)) {
    // early return if we are not an array such as being undefined or null or malformed.
    return [];
  } else {
    return exceptionsList.flatMap((exceptionItem) => {
      if (!(exceptionItem instanceof Object) || !isString(exceptionItem.id)) {
        // return early if we are not an object such as being undefined or null or malformed
        // or the exceptionItem.id is not a string from being malformed
        return [];
      } else {
        return [exceptionItem];
      }
    });
  }
}

/**
 * This migrates exception list containers to saved object references on an upgrade.
 * We only migrate if we find these conditions:
 *   - exceptionLists are an array and not null, undefined, or malformed data.
 *   - The exceptionList item is an object and id is a string and not null, undefined, or malformed data
 *   - The existing references do not already have an exceptionItem reference already found within it.
 * Some of these issues could crop up during either user manual errors of modifying things, earlier migration
 * issues, etc...
 * @param doc The document that might have exceptionListItems to migrate
 * @returns The document migrated with saved object references
 */
function addExceptionListsToReferences(
  doc: SavedObjectUnsanitizedDoc<RawRule>
): SavedObjectUnsanitizedDoc<RawRule> {
  const {
    attributes: {
      params: { exceptionsList },
    },
    references,
  } = doc;
  if (!Array.isArray(exceptionsList)) {
    // early return if we are not an array such as being undefined or null or malformed.
    return doc;
  } else {
    const exceptionsToTransform = removeMalformedExceptionsList(exceptionsList);
    const newReferences = exceptionsToTransform.flatMap<SavedObjectReference>(
      (exceptionItem, index) => {
        const existingReferenceFound = references?.find((reference) => {
          return (
            reference.id === exceptionItem.id &&
            ((reference.type === 'exception-list' && exceptionItem.namespace_type === 'single') ||
              (reference.type === 'exception-list-agnostic' &&
                exceptionItem.namespace_type === 'agnostic'))
          );
        });
        if (existingReferenceFound) {
          // skip if the reference already exists for some uncommon reason so we do not add an additional one.
          // This enables us to be idempotent and you can run this migration multiple times and get the same output.
          return [];
        } else {
          return [
            {
              name: `param:exceptionsList_${index}`,
              id: String(exceptionItem.id),
              type:
                exceptionItem.namespace_type === 'agnostic'
                  ? 'exception-list-agnostic'
                  : 'exception-list',
            },
          ];
        }
      }
    );
    if (references == null && newReferences.length === 0) {
      // Avoid adding an empty references array if the existing saved object never had one to begin with
      return doc;
    } else {
      return { ...doc, references: [...(references ?? []), ...newReferences] };
    }
  }
}

export const getMigrations7150 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) =>
  createEsoMigration(
    encryptedSavedObjects,
    (doc): doc is SavedObjectUnsanitizedDoc<RawRule> => isSiemSignalsRuleType(doc),
    pipeMigrations(addExceptionListsToReferences)
  );
