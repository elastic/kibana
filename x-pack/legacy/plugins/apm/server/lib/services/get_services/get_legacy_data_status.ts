/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  OBSERVER_VERSION_MAJOR,
  PROCESSOR_EVENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';

// returns true if 6.x data is found
export async function getLegacyDataStatus(setup: Setup) {
  const { client, config } = setup;

  const params = {
    terminateAfter: 1,
    index: [config.get<string>('apm_oss.transactionIndices')],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { [PROCESSOR_EVENT]: ['transaction'] } },
            { range: { [OBSERVER_VERSION_MAJOR]: { lt: 7 } } }
          ]
        }
      }
    }
  };

  const resp = await client.search(params, { includeLegacyData: true });
  const hasLegacyData = resp.hits.total > 0;
  return hasLegacyData;
}
