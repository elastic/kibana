/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getInitialFilters({
  mapStateJSON,
  appState = {},
  pinnedFilters = [],
}) {

  if (appState.filters) {
    return [...appState.filters, ...pinnedFilters];
  }

  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.filters) {
      return [...mapState.filters, ...pinnedFilters];
    }
  }

  return pinnedFilters;
}
