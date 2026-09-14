/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ImportedSavedObject {
  id: string;
  type: string;
  title: string;
}

/** Resolves a saved-object id after `scoutSpace.savedObjects.load()` (createNewCopies assigns new ids). */
export const getImportedSavedObjectId = (
  imported: ImportedSavedObject[],
  type: string,
  title: string
): string => {
  const so = imported.find(
    (savedObject) => savedObject.type === type && savedObject.title === title
  );
  if (!so?.id) {
    throw new Error(`${type} "${title}" was not imported`);
  }
  return so.id;
};

/** Resolves a dashboard id after `scoutSpace.savedObjects.load()` (createNewCopies assigns new ids). */
export const getImportedDashboardId = (
  imported: ImportedSavedObject[],
  dashboardTitle: string
): string => {
  return getImportedSavedObjectId(imported, 'dashboard', dashboardTitle);
};
