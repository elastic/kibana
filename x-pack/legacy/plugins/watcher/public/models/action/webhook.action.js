/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['host', 'port'];
const optionalFields = [
  'scheme',
  'path',
  'method',
  'headers',
  'params',
  'auth',
  'body',
  'proxy',
  'connection_timeout',
  'read_timeout',
  'url'
];

const allFields = [...requiredFields, ...optionalFields];

export class WebhookAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    this.fields = {};
    allFields.forEach((field) => {
      this.fields[field] = get(props, field);
    });

    const { url, host, port, path } = this.fields;
    this.fullPath = url ? url : host + port + path;
  }

  get upstreamJson() {
    // Add all required fields to the request body
    let result = requiredFields.reduce((acc, field) => {
      acc[field] = this.fields[field];
      return acc;
    }, super.upstreamJson);

    // If optional fields have been set, add them to the body
    result = optionalFields.reduce((acc, field) => {
      if (this[field]) {
        acc[field] = this.fields[field];
      }
      return acc;
    }, result);

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.webhookAction.description', {
      defaultMessage: 'Webhook will trigger a {method} request on {fullPath}',
      values: {
        method: this.method,
        fullPath: this.fullPath
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateMessage', {
      defaultMessage: 'Sample request sent to {fullPath}',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateFailMessage', {
      defaultMessage: 'Failed to send request to {fullPath}.',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new WebhookAction(upstreamAction);
  }
}
