/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { reduce } from 'lodash';
import { ROUTES, WATCH_TYPES, ACTION_MODES } from '../../../common/constants';
import { ExecuteDetails } from 'plugins/watcher/models/execute_details';
import { Watch } from 'plugins/watcher/models/watch';
import { WatchStatus } from 'plugins/watcher/models/watch_status';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';

export class WatchService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  newWatch(watchType = WATCH_TYPES.JSON) {
    const WatchType = Watch.getWatchTypes()[watchType];
    return new WatchType();
  }

  loadWatch(id) {
    return this.$http.get(`${this.basePath}/watch/${id}`)
      .then(response => {
        return Watch.fromUpstreamJson(response.data.watch);
      });
  }

  /**
   * @param watchId string ID of watch
   * @param startTime string Relative representation of start time of watch
   *   history, e.g. "now-1h"
   * @return Promise Array of watch history items
   */
  loadWatchHistory(watchId, startTime) {
    let url = `${this.basePath}/watch/${watchId}/history`;
    if (startTime) {
      url += `?startTime=${startTime}`;
    }

    return this.$http.get(url)
      .then(response => response.data.watchHistoryItems)
      .then(watchHistoryItems => watchHistoryItems.map(WatchHistoryItem.fromUpstreamJson));
  }

  saveWatch(watchModel) {
    const url = `${this.basePath}/watch/${watchModel.id}`;

    return this.$http.put(url, watchModel.upstreamJson)
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param id string ID of watch to delete
   * @return Promise
   */
  deleteWatch(id) {
    return this.$http.delete(`${this.basePath}/watch/${id}`)
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param id string ID of watch to deactivate
   * @return Promise
   */
  deactivateWatch(id) {
    const url = `${this.basePath}/watch/${id}/deactivate`;
    return this.$http.put(url)
      .then(response => {
        return WatchStatus.fromUpstreamJson(response.data.watchStatus);
      })
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param id string ID of watch to activate
   * @return Promise
   */
  activateWatch(id) {
    const url = `${this.basePath}/watch/${id}/activate`;
    return this.$http.put(url)
      .then(response => {
        return WatchStatus.fromUpstreamJson(response.data.watchStatus);
      })
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param watchId string ID of watch whose action is being acknowledged
   * @param actionId string ID of watch action to acknowledge
   * @return Promise updated WatchStatus object
   */
  acknowledgeWatchAction(watchId, actionId) {
    const url = `${this.basePath}/watch/${watchId}/action/${actionId}/acknowledge`;
    return this.$http.put(url)
      .then(response => {
        return WatchStatus.fromUpstreamJson(response.data.watchStatus);
      })
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param executeDetailsModel ExecuteDetailsModel instance with options on how to execute the watch
   * @param watchModel Watch instance
   * @return Promise which returns a populated WatchHistoryItem on success
   */
  executeWatch(executeDetailsModel, watchModel) {
    return this.$http.put(`${this.basePath}/watch/execute`, {
      executeDetails: executeDetailsModel.upstreamJson,
      watch: watchModel.upstreamJson
    })
      .then(response => {
        return WatchHistoryItem.fromUpstreamJson(response.data.watchHistoryItem);
      })
      .catch(e => {
        throw e.data.message;
      });
  }

  /**
   * @param watchModel Watch instance
   * @param actionModel Watch instance
   * @return Promise which returns a populated WatchHistoryItem on success
   */
  simulateWatchAction(watchModel, actionModel) {
    const actionModes = reduce(watchModel.actions, (acc, action) => {
      acc[action.id] = (action === actionModel) ?
        ACTION_MODES.FORCE_EXECUTE :
        ACTION_MODES.SKIP;
      return acc;
    }, {});

    const executeDetails = new ExecuteDetails({
      triggeredTime: 'now',
      scheduledTime: 'now',
      ignoreCondition: true,
      actionModes,
      recordExecution: false
    });

    return this.executeWatch(executeDetails, watchModel);
  }

  visualizeWatch(watchModel, visualizeOptions) {
    return this.$http.post(`${this.basePath}/watch/visualize`, {
      watch: watchModel.upstreamJson,
      options: visualizeOptions.upstreamJson
    })
      .then(response => {
        return response.data;
      })
      .catch(e => {
        throw e.data.message;
      });
  }
}
