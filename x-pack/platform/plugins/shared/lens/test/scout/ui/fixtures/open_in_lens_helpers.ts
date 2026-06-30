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

/** Resolves a dashboard id after `scoutSpace.savedObjects.load()` (createNewCopies assigns new ids). */
export function getImportedDashboardId(
  imported: ImportedSavedObject[],
  dashboardTitle: string
): string {
  const dashboard = imported.find(
    (savedObject) => savedObject.type === 'dashboard' && savedObject.title === dashboardTitle
  );
  if (!dashboard?.id) {
    throw new Error(`Dashboard "${dashboardTitle}" was not imported`);
  }
  return dashboard.id;
}
