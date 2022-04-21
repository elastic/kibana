/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewSpec } from '@kbn/data-plugin/common';
import { FtrService } from '../ftr_provider_context';

export class IndexPatternsService extends FtrService {
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  /**
   * Create a new index pattern
   */
  async create(
    indexPattern: { title: string; timeFieldName?: string },
    { override = false }: { override: boolean },
    spaceId = ''
  ): Promise<DataViewSpec> {
    const response = await this.kibanaServer.request<{
      index_pattern: DataViewSpec;
    }>({
      path: `${spaceId}/api/index_patterns/index_pattern`,
      method: 'POST',
      body: {
        override,
        index_pattern: indexPattern,
      },
    });

    return response.data.index_pattern;
  }
}
