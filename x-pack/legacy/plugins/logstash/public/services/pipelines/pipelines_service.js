/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES, MONITORING } from '../../../common/constants';
import { PipelineListItem } from 'plugins/logstash/models/pipeline_list_item';

const RECENTLY_DELETED_PIPELINE_IDS_STORAGE_KEY = 'xpack.logstash.recentlyDeletedPipelines';

export class PipelinesService {
  constructor($http, $window, Promise, monitoringService) {
    this.$http = $http;
    this.$window = $window;
    this.Promise = Promise;
    this.monitoringService = monitoringService;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  getPipelineList() {
    return this.Promise.all([
      this.getManagementPipelineList(),
      this.getMonitoringPipelineList(),
    ]).then(([managementPipelines, monitoringPipelines]) => {
      const now = Date.now();

      // Monitoring will report centrally-managed pipelines as well, including recently-deleted centrally-managed ones.
      // If there's a recently-deleted pipeline we're keeping track of BUT monitoring doesn't report it, that means
      // it's not running in Logstash any more. So we can stop tracking it as a recently-deleted pipeline.
      const monitoringPipelineIds = monitoringPipelines.map(pipeline => pipeline.id);
      this.getRecentlyDeleted().forEach(recentlyDeletedPipeline => {
        // We don't want to stop tracking the recently-deleted pipeline until Monitoring has had some
        // time to report on it. Otherwise, if we stop tracking first, *then* Monitoring reports it, we'll
        // still end up showing it in the list until Monitoring stops reporting it.
        if (now - recentlyDeletedPipeline.deletedOn < MONITORING.ACTIVE_PIPELINE_RANGE_S * 1000) {
          return;
        }

        // If Monitoring is still reporting the pipeline, don't stop tracking it yet
        if (monitoringPipelineIds.includes(recentlyDeletedPipeline.id)) {
          return;
        }

        this.removeFromRecentlyDeleted(recentlyDeletedPipeline.id);
      });

      // Merge centrally-managed pipelines with pipelines reported by monitoring. Take care to dedupe
      // while merging because monitoring will (rightly) report centrally-managed pipelines as well,
      // including recently-deleted ones!
      const managementPipelineIds = managementPipelines.map(pipeline => pipeline.id);
      return managementPipelines.concat(
        monitoringPipelines.filter(
          monitoringPipeline =>
            !managementPipelineIds.includes(monitoringPipeline.id) &&
            !this.isRecentlyDeleted(monitoringPipeline.id)
        )
      );
    });
  }

  getManagementPipelineList() {
    return this.$http
      .get(`${this.basePath}/pipelines`)
      .then(response =>
        response.data.pipelines.map(pipeline => PipelineListItem.fromUpstreamJSON(pipeline))
      );
  }

  getMonitoringPipelineList() {
    return this.monitoringService.getPipelineList();
  }

  /**
   * Delete a collection of pipelines
   *
   * @param pipelineIds Array of pipeline IDs
   * @return Promise { numSuccesses, numErrors }
   */
  deletePipelines(pipelineIds) {
    const body = {
      pipelineIds,
    };
    return this.$http.post(`${this.basePath}/pipelines/delete`, body).then(response => {
      this.addToRecentlyDeleted(...pipelineIds);
      return response.data.results;
    });
  }

  addToRecentlyDeleted(...pipelineIds) {
    const recentlyDeletedPipelines = this.getRecentlyDeleted();
    const recentlyDeletedPipelineIds = recentlyDeletedPipelines.map(pipeline => pipeline.id);
    pipelineIds.forEach(pipelineId => {
      if (!recentlyDeletedPipelineIds.includes(pipelineId)) {
        recentlyDeletedPipelines.push({
          id: pipelineId,
          deletedOn: Date.now(),
        });
      }
    });
    this.setRecentlyDeleted(recentlyDeletedPipelines);
  }

  removeFromRecentlyDeleted(...pipelineIds) {
    const recentlyDeletedPipelinesToKeep = this.getRecentlyDeleted().filter(
      recentlyDeletedPipeline => !pipelineIds.includes(recentlyDeletedPipeline.id)
    );
    this.setRecentlyDeleted(recentlyDeletedPipelinesToKeep);
  }

  isRecentlyDeleted(pipelineId) {
    return this.getRecentlyDeleted()
      .map(pipeline => pipeline.id)
      .includes(pipelineId);
  }

  getRecentlyDeleted() {
    const recentlyDeletedPipelines = this.$window.localStorage.getItem(
      RECENTLY_DELETED_PIPELINE_IDS_STORAGE_KEY
    );
    if (!recentlyDeletedPipelines) {
      return [];
    }

    return JSON.parse(recentlyDeletedPipelines);
  }

  setRecentlyDeleted(recentlyDeletedPipelineIds) {
    this.$window.localStorage.setItem(
      RECENTLY_DELETED_PIPELINE_IDS_STORAGE_KEY,
      JSON.stringify(recentlyDeletedPipelineIds)
    );
  }
}
