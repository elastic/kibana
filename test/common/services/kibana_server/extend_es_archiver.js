/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const ES_ARCHIVER_LOAD_METHODS = ['load', 'loadIfNeeded', 'unload'];
const KIBANA_INDEX = '.kibana';

export function extendEsArchiver({ esArchiver, kibanaServer, retry, defaults }) {
  // only extend the esArchiver if there are default uiSettings to restore
  if (!defaults) {
    return;
  }

  ES_ARCHIVER_LOAD_METHODS.forEach((method) => {
    const originalMethod = esArchiver[method];

    esArchiver[method] = async (...args) => {
      // esArchiver methods return a stats object, with information about the indexes created
      const stats = await originalMethod.apply(esArchiver, args);

      const statsKeys = Object.keys(stats);
      const kibanaKeys = statsKeys.filter(
        // this also matches stats keys like '.kibana_1' and '.kibana_2,.kibana_1'
        (key) => key.includes(KIBANA_INDEX) && (stats[key].created || stats[key].deleted)
      );

      // if the kibana index was created by the esArchiver then update the uiSettings
      // with the defaults to make sure that they are always in place initially
      if (kibanaKeys.length > 0) {
        await retry.try(async () => {
          await kibanaServer.uiSettings.update(defaults);
        });
      }

      return stats;
    };
  });
}
