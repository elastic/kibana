/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class WebhookAction extends BaseAction {
  constructor(props = {}) {
    super(props);
    const defaultJson = JSON.stringify(
      { message: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold' },
      null,
      2
    );
    this.body = get(props, 'body', props.ignoreDefaults ? null : defaultJson);
    this.method = get(props, 'method');
    this.host = get(props, 'host');
    this.port = get(props, 'port');
    this.scheme = get(props, 'scheme');
    this.path = get(props, 'path');
    this.username = get(props, 'username');
    this.password = get(props, 'password');
    this.contentType = get(props, 'contentType');

    if (typeof this.path !== "undefined") 
    {
      this.fullPath = `${this.host}:${this.port}/${this.path}`;
    } 
    else {
      this.fullPath = `${this.host}:${this.port}`;
    }
  }

  validate() {
    const errors = {
      host: [],
      port: [],
      body: [],
      username: [],
      password: [],
    };

    if (!this.host) {
      errors.host.push(
        i18n.translate('xpack.watcher.watchActions.webhook.hostIsRequiredValidationMessage', {
          defaultMessage: 'Webhook host is required.',
        })
      );
    }

    if (!this.port) {
      errors.port.push(
        i18n.translate('xpack.watcher.watchActions.webhook.portIsRequiredValidationMessage', {
          defaultMessage: 'Webhook port is required.',
        })
      );
    }

    if (
      this.contentType === 'application/json' &&
      typeof this.body === 'string' &&
      this.body !== ''
    ) {
      const invalidJsonMessage = i18n.translate(
        'xpack.watcher.watchActions.webhook.invalidJsonValidationMessage',
        {
          defaultMessage: 'Invalid JSON',
        }
      );

      try {
        const parsedJson = JSON.parse(this.body);

        if (parsedJson && typeof parsedJson !== 'object') {
          errors.body.push(invalidJsonMessage);
        }
      } catch (e) {
        errors.body.push(invalidJsonMessage);
      }
    }

    // Password is required if username specified
    if (this.username && !this.password) {
      errors.password.push(
        i18n.translate(
          'xpack.watcher.watchActions.webhook.passwordIsRequiredIfUsernameValidationMessage',
          {
            defaultMessage: 'Password is required.',
          }
        )
      );
    }

    // Username is required if password is specified
    if (this.password && !this.username) {
      errors.username.push(
        i18n.translate(
          'xpack.watcher.watchActions.webhook.usernameIsRequiredIfPasswordValidationMessage',
          {
            defaultMessage: 'Username is required.',
          }
        )
      );
    }

    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      method: this.method,
      host: this.host,
      port: this.port,
      scheme: this.scheme,
      path: this.path,
      body: this.body,
      username: this.username,
      password: this.password,
      webhook: {
        host: this.host,
        port: this.port,
      },
    });

    return result;
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateMessage', {
      defaultMessage: 'Sample request sent to {fullPath}',
      values: {
        fullPath: this.fullPath,
      },
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateFailMessage', {
      defaultMessage: 'Failed to send request to {fullPath}.',
      values: {
        fullPath: this.fullPath,
      },
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new WebhookAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.webhookAction.typeName', {
    defaultMessage: 'Webhook',
  });
  static iconClass = 'logoWebhook';
  static selectMessage = i18n.translate('xpack.watcher.models.webhookAction.selectMessageText', {
    defaultMessage: 'Send a request to a web service.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.webhookAction.simulateButtonLabel', {
    defaultMessage: 'Send request',
  });
}
