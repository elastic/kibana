/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes, SavedObjectReference } from 'kibana/public';
import { SavedWorkspace } from './saved_workspace';

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}) {
  // For some reason, wsState comes in stringified 2x
  const state = JSON.parse(JSON.parse(String(attributes.wsState)));
  const { indexPattern } = state;
  if (!indexPattern) {
    throw new Error('indexPattern attribute is missing in "wsState"');
  }
  state.indexPatternRefName = 'indexPattern_0';
  delete state.indexPattern;
  return {
    references: [
      ...references,
      {
        name: 'indexPattern_0',
        type: 'index-pattern',
        id: indexPattern,
      },
    ],
    attributes: {
      ...attributes,
      wsState: JSON.stringify(JSON.stringify(state)),
    },
  };
}

export function injectReferences(savedObject: SavedWorkspace, references: SavedObjectReference[]) {
  // Skip if wsState is missing, at the time of development of this, there is no guarantee each
  // saved object has wsState.
  if (typeof savedObject.wsState !== 'string') {
    return;
  }
  // Only need to parse / stringify once here compared to extractReferences
  const state = JSON.parse(savedObject.wsState);
  // Like the migration, skip injectReferences if "indexPatternRefName" is missing
  if (!state.indexPatternRefName) {
    return;
  }
  const indexPatternReference = references.find(
    reference => reference.name === state.indexPatternRefName
  );
  if (!indexPatternReference) {
    // Throw an error as "indexPatternRefName" means the reference exists within
    // "references" and in this scenario we have bad data.
    throw new Error(`Could not find reference "${state.indexPatternRefName}"`);
  }
  state.indexPattern = indexPatternReference.id;
  delete state.indexPatternRefName;
  savedObject.wsState = JSON.stringify(state);
}
