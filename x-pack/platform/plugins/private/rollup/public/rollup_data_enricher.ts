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

export const rollupDataEnricher = {
  name: SOURCE,
  fn: async (client: HttpSetup, signal: AbortSignal): Promise<EnricherResponse> =>
    client
      .get<RollupGetRollupIndexCapsResponse>('/api/rollup/indices_caps', { signal })
      .then((response) => {
        return {
          applyToAliases: true,
          indices: Object.keys(response).reduce<{ name: string; isRollupIndex: true }[]>(
            (acc, rollupJob) => {
              response[rollupJob].rollup_jobs.forEach((job) => {
                acc.push({
                  name: job.rollup_index,
                  isRollupIndex: true,
                });
              });
              return acc;
            },
            []
          ),
          source: SOURCE,
        };
      }),
};
