/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Action } from '../lib/api';

export const BUILDIN_ACTION_TYPES: { [key: string]: string } = {
  EMAIL: '.email',
  WEBHOOK: '.webhook',
  INDEX: '.index',
  LOGGING: '.server-log',
  SLACK: '.slack',
  PAGERDUTY: '.pagerduty',
  CUSTOM: '.custom',
};

interface ActionTypeSettings {
  iconClass: string;
  selectMessage: string;
  simulatePrompt: string;
  validate: any;
}

export const actionTypesSettings = (val: string): ActionTypeSettings => {
  let res;
  switch (val) {
    case '.email':
      res = {
        iconClass: 'email',
        selectMessage: i18n.translate(
          'xpack.alertingUI.sections.actions.emailAction.selectMessageText',
          {
            defaultMessage: 'Send an email from your server.',
          }
        ),
        simulatePrompt: i18n.translate(
          'xpack.alertingUI.sections.actions.emailAction.simulateButtonLabel',
          {
            defaultMessage: 'Send test email',
          }
        ),
        validate: (action: Action): any => {
          const validationResult = { errors: {} };
          const errors = {
            from: new Array<string>(),
            port: new Array<string>(),
            host: new Array<string>(),
            user: new Array<string>(),
            password: new Array<string>(),
          };
          validationResult.errors = errors;
          if (!action.config.from) {
            errors.from.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredFromText', {
                defaultMessage: 'From is required.',
              })
            );
          }
          if (!action.config.port) {
            errors.port.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredPortText', {
                defaultMessage: 'Port is required.',
              })
            );
          }
          if (!action.config.host) {
            errors.host.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
                defaultMessage: 'Host is required.',
              })
            );
          }
          if (!action.secrets.user) {
            errors.user.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
                defaultMessage: 'User is required.',
              })
            );
          }
          if (!action.secrets.password) {
            errors.password.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
                defaultMessage: 'Password is required.',
              })
            );
          }
          return validationResult;
        },
      };
      break;
    case '.slack':
      res = {
        iconClass: 'logoSlack',
        selectMessage: i18n.translate(
          'xpack.alertingUI.sections.actions.slackAction.selectMessageText',
          {
            defaultMessage: 'Send a message to a Slack user or channel.',
          }
        ),
        simulatePrompt: i18n.translate(
          'xpack.alertingUI.sections.actions.slackAction.simulateButtonLabel',
          {
            defaultMessage: 'Send a sample message',
          }
        ),
        validate: (action: Action): any => {
          const validationResult = { errors: {} };
          const errors = {
            webhookUrl: new Array<string>(),
          };
          validationResult.errors = errors;
          if (!action.secrets.webhookUrl) {
            errors.webhookUrl.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredWebhookUrlText', {
                defaultMessage: 'WebhookUrl is required.',
              })
            );
          }
          return validationResult;
        },
      };
      break;
    case '.server-log':
      res = {
        iconClass: 'loggingApp',
        selectMessage: i18n.translate(
          'xpack.alertingUI.sections.actions.serverLogAction.selectMessageText',
          {
            defaultMessage: 'Add an item to the logs.',
          }
        ),
        simulatePrompt: i18n.translate(
          'xpack.alertingUI.sections.actions.serverLogAction.simulateButtonLabel',
          {
            defaultMessage: 'Log a sample message',
          }
        ),
        validate: (action: Action): any => {
          return { errors: {} };
        },
      };
      break;
    case '.index':
      res = {
        iconClass: 'indexOpen',
        selectMessage: i18n.translate('xpack.watcher.models.indexAction.selectMessageText', {
          defaultMessage: 'Index data into Elasticsearch.',
        }),
        simulatePrompt: i18n.translate('xpack.watcher.models.indexAction.simulateButtonLabel', {
          defaultMessage: 'Index data',
        }),
        validate: (action: Action): any => {
          return { errors: {} };
        },
      };
      break;
    case '.pagerduty':
      res = {
        iconClass: 'apps',
        selectMessage: i18n.translate('xpack.watcher.models.pagerDutyAction.selectMessageText', {
          defaultMessage: 'Create an event in PagerDuty.',
        }),
        simulatePrompt: i18n.translate('xpack.watcher.models.pagerDutyAction.simulateButtonLabel', {
          defaultMessage: 'Send a PagerDuty event',
        }),
        validate: (action: Action): any => {
          const validationResult = { errors: {} };
          const errors = {
            routingKey: new Array<string>(),
            apiUrl: new Array<string>(),
          };
          validationResult.errors = errors;
          if (!action.secrets.routingKey) {
            errors.routingKey.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredRoutingKeyText', {
                defaultMessage: 'RoutingKey is required.',
              })
            );
          }
          if (!action.config.apiUrl) {
            errors.apiUrl.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredApiUrlText', {
                defaultMessage: 'ApiUrl is required.',
              })
            );
          }
          return validationResult;
        },
      };
      break;
    case '.webhook':
      res = {
        iconClass: 'logoWebhook',
        selectMessage: i18n.translate('xpack.watcher.models.webhookAction.selectMessageText', {
          defaultMessage: 'Send a request to a web service.',
        }),
        simulatePrompt: i18n.translate('xpack.watcher.models.webhookAction.simulateButtonLabel', {
          defaultMessage: 'Send request',
        }),
        validate: (action: Action): any => {
          const validationResult = { errors: {} };
          const errors = {
            url: new Array<string>(),
            method: new Array<string>(),
            user: new Array<string>(),
            password: new Array<string>(),
          };
          validationResult.errors = errors;
          if (!action.config.url) {
            errors.url.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredUrlText', {
                defaultMessage: 'Url is required.',
              })
            );
          }
          if (!action.config.method) {
            errors.method.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredMethodText', {
                defaultMessage: 'Method is required.',
              })
            );
          }
          if (!action.secrets.user) {
            errors.user.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
                defaultMessage: 'User is required.',
              })
            );
          }
          if (!action.secrets.password) {
            errors.password.push(
              i18n.translate('xpack.alertingUI.sections.addAction.error.requiredHostText', {
                defaultMessage: 'Password is required.',
              })
            );
          }
          return validationResult;
        },
      };
      break;
    default:
      res = {
        iconClass: 'apps',
        simulatePrompt: '',
        selectMessage: '',
        validate: (action: Action): any => {
          return { errors: {} };
        },
      };
  }
  return res;
};
