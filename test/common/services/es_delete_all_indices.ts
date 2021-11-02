/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EsDeleteAllIndicesProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  async function deleteConcreteIndices(indices: string[]) {
    try {
      await es.indices.delete({
        index: indices,
        ignore_unavailable: true,
      });
    } catch (error) {
      log.debug(`Failed to delete indices [${indices}], but ignoring error: ${error.message}`);
    }
  }

  return async (patterns: string | string[]) => {
    for (const pattern of [patterns].flat()) {
      for (let attempt = 1; ; attempt++) {
        if (attempt > 5) {
          throw new Error(`Failed to delete all indices with pattern [${pattern}]`);
        }

        // resolve pattern to concrete index names
        const resp = await es.indices.getAlias(
          {
            index: pattern,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        const indices = Object.keys(resp.body) as string[];

        // if no indexes exits then we're done with this pattern
        if (resp.statusCode === 404 || !indices.length) {
          if (attempt === 1) {
            log.debug(`No indices to delete [pattern=${pattern}]`);
          }
          break;
        }

        log.debug(
          `Deleting indices [attempt=${attempt}] [pattern=${pattern}] "${indices.join('", "')}"`
        );

        // delete the concrete indexes we found and try again until this pattern resolves to no indexes
        await deleteConcreteIndices(indices);
      }
    }
  };
}
