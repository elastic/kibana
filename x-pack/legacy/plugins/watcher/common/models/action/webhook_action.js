/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class WebhookAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.WEBHOOK;
    super(props, errors);

    this.method = props.method;
    this.host = props.host;
    this.port = props.port;
    this.path = props.path;
    this.body = props.body;
    this.contentType = props.contentType;
    this.username = props.username;
    this.password = props.password;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      method: this.method,
      host: this.host,
      port: this.port,
      path: this.path,
      body: this.body,
      contentType: this.contentType,
      username: this.username,
    });
    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      method: json.method,
      host: json.host,
      port: json.port,
      path: json.path,
      body: json.body,
      contentType: json.contentType,
      username: json.username,
      password: json.password,
    });

    const action = new WebhookAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    const optionalFields = {};

    if (this.path) {
      optionalFields.path = this.path;
    }

    if (this.method) {
      optionalFields.method = this.method;
    }

    if (this.body) {
      optionalFields.body = this.body;
    }

    if (this.contentType) {
      optionalFields.headers = {
        'Content-Type': this.contentType,
      };
    }

    if (this.username && this.password) {
      optionalFields.auth = {
        basic: {
          username: this.username,
          password: this.password,
        },
      };
    }

    result[this.id] = {
      webhook: {
        host: this.host,
        port: this.port,
        ...optionalFields,
      },
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const webhookJson = json && json.actionJson && json.actionJson.webhook;
    const { errors } = this.validateJson(json.actionJson);

    const { path, method, body, auth, headers } = webhookJson;

    const optionalFields = {};

    if (path) {
      optionalFields.path = path;
    }

    if (method) {
      optionalFields.method = method;
    }

    if (body) {
      optionalFields.body = body;
    }

    if (headers['Content-Type']) {
      optionalFields.contentType = headers['Content-Type'];
    }

    if (auth && auth.basic) {
      optionalFields.username = auth.basic.username;
    }

    Object.assign(props, {
      host: json.actionJson.webhook.host,
      port: json.actionJson.webhook.port,
      ...optionalFields,
    });

    const action = new WebhookAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (json.webhook && !json.webhook.host) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.loggingAction.actionJsonWebhookHostPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonWebhookHost} property',
            values: {
              actionJsonWebhookHost: 'actionJson.webhook.host',
            },
          }
        ),
      });
    }

    if (json.webhook && !json.webhook.port) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.loggingAction.actionJsonWebhookPortPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonWebhookPort} property',
            values: {
              actionJsonWebhookPort: 'actionJson.webhook.port',
            },
          }
        ),
      });
    }

    return { errors: errors.length ? errors : null };
  }
}
