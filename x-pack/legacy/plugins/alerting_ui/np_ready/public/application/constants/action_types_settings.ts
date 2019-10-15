/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const BUILDIN_ACTION_TYPES: { [key: string]: string } = {
  EMAIL: '.email',
  WEBHOOK: '.webhook',
  INDEX: '.index',
  LOGGING: '.server-log',
  SLACK: '.slack',
  PAGERDUTY: '.pagerduty',
  CUSTOM: '.custom',
};

export const actionTypesSettings = (val: string) => {
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
      };
      break;
    default:
      res = { typeName: '', iconClass: 'apps', selectMessage: '' };
  }
  return res;
};
