/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { get } from 'lodash';
import { BaseWatch } from './base_watch';
import { ACTION_TYPES, WATCH_TYPES } from '../../../../../common/constants';
import defaultWatchJson from './default_watch.json';
import { i18n } from '@kbn/i18n';

/**
 * {@code JsonWatch} allows a user to create a Watch by writing the raw JSON.
 */
export class JsonWatch extends BaseWatch {
  constructor(props = {}) {
    props.type = WATCH_TYPES.JSON;
    props.id = typeof props.id === 'undefined' ? uuid.v4() : props.id;
    super(props);
    const existingWatch = get(props, 'watch');
    this.watch = existingWatch ? existingWatch : defaultWatchJson;
    this.watchString = get(props, 'watchString', JSON.stringify(existingWatch ? existingWatch : defaultWatchJson, null, 2));
    this.id = props.id;
  }

  validate() {
    const validationResult = {};
    const idRegex = /^[A-Za-z0-9\-\_]+$/;
    const errors = {
      id: [],
      json: [],
    };
    validationResult.errors = errors;
    // Watch id validation
    if (!this.id) {
      errors.id.push(
        i18n.translate('xpack.watcher.sections.watchEdit.json.error.requiredIdText', {
          defaultMessage: 'ID is required',
        })
      );
    } else if (!idRegex.test(this.id)) {
      errors.id.push(i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidIdText', {
        defaultMessage: 'ID can only contain letters, underscores, dashes, and numbers.',
      }));
    }
    // JSON validation
    if (!this.watchString || this.watchString === '') {
      errors.json.push(i18n.translate('xpack.watcher.sections.watchEdit.json.error.requiredJsonText', {
        defaultMessage: 'JSON is required',
      }));
    } else {
      try {
        const parsedJson = JSON.parse(this.watchString);
        if (parsedJson && typeof parsedJson === 'object') {
          const { actions } = parsedJson;
          if (actions) {
            // Validate if the action(s) provided is one of the supported actions
            const invalidActions = Object.keys(actions).find(actionKey => {
              const actionKeys = Object.keys(actions[actionKey]);
              let type;
              Object.keys(ACTION_TYPES).forEach(actionTypeKey => {
                if (actionKeys.includes(ACTION_TYPES[actionTypeKey]) && !actionKeys.includes(ACTION_TYPES.UNKNOWN)) {
                  type = ACTION_TYPES[actionTypeKey];
                }
              });
              return !type;
            });
            if (invalidActions) {
              errors.json.push(i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidActionType', {
                defaultMessage: 'Unknown action type provided for action "{action}".',
                values: {
                  action: invalidActions,
                },
              }));
            }
          }
        }
      } catch (e) {
        errors.json.push(i18n.translate('xpack.watcher.sections.watchEdit.json.error.invalidJsonText', {
          defaultMessage: 'Invalid JSON',
        }));
      }
    }
    return validationResult;
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    Object.assign(result, {
      watch: this.watch
    });
    return result;
  }

  static fromUpstreamJson(upstreamWatch) {
    return new JsonWatch(upstreamWatch);
  }

  static defaultWatchJson =  defaultWatchJson;
  static typeName = i18n.translate('xpack.watcher.models.jsonWatch.typeName', {
    defaultMessage: 'Advanced Watch'
  });
  static iconClass = '';
  static selectMessage = i18n.translate('xpack.watcher.models.jsonWatch.selectMessageText', {
    defaultMessage: 'Set up a custom watch in raw JSON.'
  });
  static isCreatable = true;
  static selectSortOrder = 100;
}
