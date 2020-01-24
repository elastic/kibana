/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseSavedObject, FlattenedCaseSavedObject } from './types';

export const flattenSavedObjects = (savedObjects: CaseSavedObject[]): FlattenedCaseSavedObject[] =>
  savedObjects.reduce((acc: FlattenedCaseSavedObject[], savedObject: CaseSavedObject) => {
    return [...acc, flattenSavedObject(savedObject)];
  }, []);

export const flattenSavedObject = (savedObject: CaseSavedObject): FlattenedCaseSavedObject => ({
  ...savedObject,
  ...savedObject.attributes,
});
