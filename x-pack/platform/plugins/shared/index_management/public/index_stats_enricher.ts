/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EnricherResponse } from '@kbn/index-management-shared-types';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { API_BASE_PATH } from '../common/constants';
const SOURCE = i18n.translate('xpack.indexManagement.indexStatsEnricher.source', {
  defaultMessage: 'index stats',
});

export const indexStatsEnricher = async (client: HttpSetup): Promise<EnricherResponse> =>
  client
    .get<IndicesStatsResponse>(`${API_BASE_PATH}/indices_stats`)
    .then((response) => {
      const indices = response.indices || {};
      return {
        indices: Object.keys(indices).map((name) => ({
          name,
          health: indices[name]?.health,
          status: indices[name]?.status,
          uuid: indices[name]?.uuid,
          documents_deleted: indices[name]?.primaries?.docs?.deleted ?? 0,
          primary_size: numeral(indices[name]?.primaries?.store?.size_in_bytes ?? 0).format(
            '0.00 b'
          ),
          documents: indices[name]?.primaries?.docs?.count ?? 0,
          size: numeral(indices[name]?.total?.store?.size_in_bytes ?? 0).format('0.00 b'),
        })),
        source: SOURCE,
      };
    })
    .catch((error) => {
      return {
        error: true,
        source: SOURCE,
      };
    });
