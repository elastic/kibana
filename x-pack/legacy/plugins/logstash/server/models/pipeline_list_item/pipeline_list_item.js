/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export class PipelineListItem {
  constructor(props) {
    this.id = props.id;
    this.description = props.description;
    this.last_modified = props.last_modified;
    this.username = props.username;
  }

  get downstreamJSON() {
    const json = {
      id: this.id,
      description: this.description,
      last_modified: this.last_modified,
      username: this.username,
    };

    return json;
  }

  /**
   * Takes the json GET response from ES and constructs a pipeline model to be used
   * in Kibana downstream
   */
  static fromUpstreamJSON(pipeline) {
    const opts = {
      id: pipeline._id,
      description: get(pipeline, '_source.description'),
      last_modified: get(pipeline, '_source.last_modified'),
      username: get(pipeline, '_source.username'),
    };

    return new PipelineListItem(opts);
  }
}
