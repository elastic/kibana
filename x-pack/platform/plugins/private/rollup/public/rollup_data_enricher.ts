/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { RollupGetRollupIndexCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EnricherResponse } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
const SOURCE = i18n.translate('xpack.rollupJobs.rollupDataEnricher.source', {
  defaultMessage: 'rollup',
});

// todo
// look at x-pack/platform/plugins/private/rollup/server/rollup_data_enricher.ts
// account for aliases
export const rollupDataEnricher = async (client: HttpSetup): Promise<EnricherResponse> =>
  client
    .get<RollupGetRollupIndexCapsResponse>('/api/rollup/indices')
    .then((response) => {
      return {
        indices: Object.keys(response).reduce((acc, rollupJob) => {
          response[rollupJob].rollup_jobs.forEach((job) => {
            acc.push({
              name: job.rollup_index,
              isRollupIndex: true,
            });
          });
          return acc;
        }, [] as { name: string; isRollupIndex: true }[]),
        source: SOURCE,
      };
    })
    .catch((error) => {
      return {
        error: true,
        source: SOURCE,
      };
    });

/*
  try {
    const rollupJobData = await client.asCurrentUser.rollup.getRollupIndexCaps({
      index: '_all',
    });

    return indicesList.map((index) => {
      let isRollupIndex = !!rollupJobData[index.name];
      if (!isRollupIndex && isArray(index.aliases)) {
        isRollupIndex = index.aliases.some((alias) => !!rollupJobData[alias]);
      }
      return {
        ...index,
        isRollupIndex,
      };
    });
  } catch (e) {
    // swallow exceptions and return original list
    return indicesList;
  }
*/
