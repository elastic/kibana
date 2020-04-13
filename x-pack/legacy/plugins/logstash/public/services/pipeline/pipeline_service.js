/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../../../../../plugins/logstash/common/constants';
import { Pipeline } from '../../models/pipeline';

export class PipelineService {
  constructor(http, pipelinesService) {
    this.http = http;
    this.pipelinesService = pipelinesService;
    this.basePath = http.basePath.prepend(ROUTES.API_ROOT);
  }

  loadPipeline(id) {
    return this.http.get(`${this.basePath}/pipeline/${id}`).then(response => {
      return Pipeline.fromUpstreamJSON(response);
    });
  }

  savePipeline(pipelineModel) {
    return this.http
      .put(`${this.basePath}/pipeline/${pipelineModel.id}`, {
        body: JSON.stringify(pipelineModel.upstreamJSON),
      })
      .catch(e => {
        throw e.message;
      });
  }

  deletePipeline(id) {
    return this.http
      .delete(`${this.basePath}/pipeline/${id}`)
      .then(() => this.pipelinesService.addToRecentlyDeleted(id))
      .catch(e => {
        throw e.message;
      });
  }
}
