/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// custom edits or fixes for default kibana types which are incomplete

import { SavedObjectAttributes, SimpleSavedObject } from 'kibana/public';

export type IndexPatternTitle = string;

export type callWithRequestType = (action: string, params?: any) => Promise<any>;

export interface Route {
  id: string;
  k7Breadcrumbs: () => any;
}

export type IndexPatternSavedObject = SimpleSavedObject<SavedObjectAttributes>;
export type SavedSearchSavedObject = SimpleSavedObject<SavedObjectAttributes>;

export function isSavedSearchSavedObject(
  ss: SavedSearchSavedObject | null
): ss is SavedSearchSavedObject {
  return ss !== null;
}
