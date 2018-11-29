/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { toastNotifications } from 'ui/notify';
import { RequestHandlerParams, Vis } from '../../vis';

// @ts-ignore No typing present
import { buildPipeline, runPipeline } from './pipeline_helpers';

export class PipelineDataLoader {
  constructor(private readonly vis: Vis) {}

  public async fetch(params: RequestHandlerParams): Promise<any> {
    this.vis.requestError = undefined;
    this.vis.showRequestError = false;
    this.vis.pipelineExpression = buildPipeline(this.vis, params);

    try {
      return await runPipeline(
        this.vis.pipelineExpression,
        {
          query: params.query,
          timeRange: params.timeRange,
          filters: params.filters
            ? params.filters.filter(filter => !filter.meta.disabled)
            : undefined,
        },
        {
          inspectorAdapters: params.inspectorAdapters,
        }
      );
    } catch (error) {
      params.searchSource.cancelQueued();

      this.vis.requestError = error;
      this.vis.showRequestError =
        error.type && ['NO_OP_SEARCH_STRATEGY', 'UNSUPPORTED_QUERY'].includes(error.type);

      // tslint:disable-next-line
      console.error(error);

      toastNotifications.addDanger({
        title: 'Error in visualization',
        text: error.message,
      });
    }
  }
}
