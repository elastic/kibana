/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmExplainLifecycleResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpSetup } from '@kbn/core/public';
import type { EnricherResponse } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
const SOURCE = i18n.translate('xpack.indexLifecycleMgmt.indexLifecycleDataEnricher.source', {
  defaultMessage: 'index lifecycle',
});

export const indexLifecycleDataEnricher = {
  name: SOURCE,
  fn: async (client: HttpSetup, signal: AbortSignal): Promise<EnricherResponse> =>
    client
      .get<IlmExplainLifecycleResponse>('/api/index_lifecycle_management/explain', { signal })
      .then((response) => {
        return {
          indices: Object.keys(response.indices).map((index) => ({
            name: index,
            ilm: response.indices[index],
          })),
          source: SOURCE,
        };
      }),
};
