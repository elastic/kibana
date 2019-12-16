/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map, pick } from 'lodash';
import { badRequest } from 'boom';
import { Action } from '../../../../common/models/action';
import { WatchStatus } from '../watch_status';
import { i18n } from '@kbn/i18n';
import { WatchErrors } from '../watch_errors';

export class BaseWatch {
  // This constructor should not be used directly.
  // JsonWatch objects should be instantiated using the
  // fromUpstreamJson and fromDownstreamJson static methods
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;

    this.isSystemWatch = false;

    this.watchStatus = props.watchStatus;
    this.watchErrors = props.watchErrors;
    this.actions = props.actions;
  }

  get watchJson() {
    const result = {
      metadata: {
        xpack: {
          type: this.type,
        },
      },
    };

    if (this.name) {
      result.metadata.name = this.name;
    }

    return result;
  }

  getVisualizeQuery() {
    return {};
  }

  formatVisualizeData() {
    return [];
  }

  // to Kibana
  get downstreamJson() {
    const json = {
      id: this.id,
      name: this.name,
      type: this.type,
      isSystemWatch: this.isSystemWatch,
      watchStatus: this.watchStatus ? this.watchStatus.downstreamJson : undefined,
      watchErrors: this.watchErrors ? this.watchErrors.downstreamJson : undefined,
      actions: map(this.actions, action => action.downstreamJson),
    };

    return json;
  }

  // to Elasticsearch
  get upstreamJson() {
    const watch = this.watchJson;

    return {
      id: this.id,
      watch,
    };
  }

  // from Kibana
  static getPropsFromDownstreamJson(json) {
    const actions = map(json.actions, action => {
      return Action.fromDownstreamJson(action);
    });

    return {
      id: json.id,
      name: json.name,
      actions,
    };
  }

  // from Elasticsearch
  static getPropsFromUpstreamJson(json, options) {
    if (!json.id) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.baseWatch.idPropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain an {id} property',
          values: {
            id: 'id',
          },
        })
      );
    }
    if (!json.watchJson) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.baseWatch.watchJsonPropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain a {watchJson} property',
          values: {
            watchJson: 'watchJson',
          },
        })
      );
    }
    if (!json.watchStatusJson) {
      throw badRequest(
        i18n.translate(
          'xpack.watcher.models.baseWatch.watchStatusJsonPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain a {watchStatusJson} property',
            values: {
              watchStatusJson: 'watchStatusJson',
            },
          }
        )
      );
    }

    const id = json.id;
    const watchJson = pick(json.watchJson, [
      'trigger',
      'input',
      'condition',
      'actions',
      'metadata',
      'transform',
      'throttle_period',
      'throttle_period_in_millis',
    ]);
    const watchStatusJson = json.watchStatusJson;
    const name = get(watchJson, 'metadata.name');

    const actionsJson = get(watchJson, 'actions', {});
    const actions = map(actionsJson, (actionJson, actionId) => {
      return Action.fromUpstreamJson({ id: actionId, actionJson }, options);
    });

    const watchErrors = WatchErrors.fromUpstreamJson(this.getWatchErrors(actions));

    const watchStatus = WatchStatus.fromUpstreamJson({
      id,
      watchStatusJson,
      watchErrors,
    });

    return {
      id,
      name,
      watchJson,
      watchStatus,
      watchErrors,
      actions,
    };
  }

  /**
   * Retrieve all the errors in the watch
   *
   * @param {array} actions - Watch actions
   */
  static getWatchErrors(actions) {
    const watchErrors = {};

    // Check for errors in Actions
    const actionsErrors = actions.reduce((acc, action) => {
      if (action.errors) {
        acc[action.id] = action.errors;
      }
      return acc;
    }, {});

    if (Object.keys(actionsErrors).length) {
      watchErrors.actions = actionsErrors;
    }

    return watchErrors;
  }
}
