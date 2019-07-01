/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

export class BaseAction {
  constructor(props = {}) {
    this.id = get(props, 'id');
    this.type = get(props, 'type');
    this.isNew = get(props, 'isNew', false);
  }

  get upstreamJson() {
    const result = {
      id: this.id,
      type: this.type
    };

    return result;
  }

  get typeName() {
    return this.constructor.typeName;
  }

  get iconClass() {
    return this.constructor.iconClass;
  }

  get selectMessage() {
    return this.constructor.selectMessage;
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.baseAction.simulateMessage', {
      defaultMessage: 'Action {id} simulated successfully',
      values: {
        id: this.id
      }
    });
  }

  get simulatePrompt() {
    return this.constructor.simulatePrompt;
  }

  static typeName = i18n.translate('xpack.watcher.models.baseAction.typeName', {
    defaultMessage: 'Action',
  });
  static iconClass = 'apps';
  static selectMessage = i18n.translate('xpack.watcher.models.baseAction.selectMessageText', {
    defaultMessage: 'Perform an action.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.baseAction.simulateButtonLabel', {
    defaultMessage: 'Simulate this action now',
  });
}
