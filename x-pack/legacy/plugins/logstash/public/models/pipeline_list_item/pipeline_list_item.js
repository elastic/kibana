/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, capitalize } from 'lodash';

import { getSearchValue } from 'plugins/logstash/lib/get_search_value';
import { getMoment } from 'plugins/logstash/../common/lib/get_moment';
import { PIPELINE } from '../../../common/constants';

/**
 * Represents the model for listing pipelines in the UI
 * @param {string} props.id Named Id of the pipeline
 * @param {string} props.description Description for the pipeline
 * @param {string} props.lastModified Timestamp when the config was last modified
 * @param {string} props.username User who created or updated the pipeline
 */
export class PipelineListItem {
  constructor(props) {
    this.id = props.id;
    this.origin = props.origin;
    this.description = props.description;
    this.username = props.username;

    if (props.lastModified) {
      this.lastModified = getMoment(props.lastModified);
      this.lastModifiedHumanized = capitalize(this.lastModified.fromNow());
    }
  }

  get searchValue() {
    return getSearchValue(this, ['id']);
  }

  get isCentrallyManaged() {
    return this.origin === PIPELINE.ORIGIN.CCM;
  }

  static fromUpstreamJSON(pipelineListItem) {
    const props = pick(pipelineListItem, ['id', 'description', 'username']);
    props.origin = PIPELINE.ORIGIN.CCM;
    props.lastModified = pipelineListItem.last_modified;
    return new PipelineListItem(props);
  }

  static fromUpstreamMonitoringJSON(pipelineListItem) {
    const props = pick(pipelineListItem, ['id']);
    props.origin = PIPELINE.ORIGIN.OTHER;
    return new PipelineListItem(props);
  }
}
