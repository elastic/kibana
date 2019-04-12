/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebClient } from '@slack/client';

import { Action, ActionResult } from '../';

export const SLACK_ACTION_ID = 'xpack-notifications-slack';

/**
 * Create a new Slack {@code WebClient}.
 *
 * Currently the only option expected is {@code token}.
 *
 * @param {Object} options Slack API options.
 * @returns {WebClient} Always.
 */
export function webClientCreator(options) {
  return new WebClient(options.token);
}

/**
 * Slack Action enables generic sending of Slack messages.
 */
export class SlackAction extends Action {

  /**
   * Create a new Action capable of sending Slack messages.
   *
   * @param {Object} server Kibana server object.
   * @param {Object} options Configuration options for the Slack WebClient. Currently only expect "token" field.
   * @param {Object} defaults Default fields used when sending messages.
   * @param {Function} _webClientCreator Exposed for tests.
   */
  constructor({ server, options, defaults = { }, _webClientCreator = webClientCreator }) {
    super({ server, id: SLACK_ACTION_ID, name: 'Slack' });

    this.client = _webClientCreator(options);
    this.defaults = defaults;
  }

  getMissingFields(data) {
    const missingFields = [];

    if (!Boolean(this.defaults.channel) && !Boolean(data.channel)) {
      missingFields.push({
        field: 'channel',
        name: 'Channel',
        type: 'text',
      });
    }

    if (!Boolean(data.subject)) {
      missingFields.push({
        field: 'subject',
        name: 'Message',
        type: 'markdown',
      });
    }

    return missingFields;
  }

  async doPerformHealthCheck() {
    const response = await this.client.api.test();

    if (response.ok) {
      return new ActionResult({
        message: `Slack action configuration has been verified.`,
        response,
      });
    }

    return new ActionResult({
      message: `Slack action configuration could not be verified.`,
      response,
      error: response.error || { message: 'Unknown Error' },
    });
  }

  /**
   * Render the message based on whether or not a {@code markdown} body was supplied.
   */
  renderMessage({ subject, markdown }) {
    const attachments = [];

    if (markdown) {
      attachments.push({ text: markdown });
    }

    return { text: subject, attachments };
  }

  async doPerformAction({ subject, markdown, channel }) {
    // NOTE: When we want to support files, then we should look into using client.files.upload({ ... })
    //       without _also_ sending chat message because the file upload endpoint supports chat behavior
    //       in addition to files, but the reverse is not true.
    const slackChannel = channel || this.defaults.channel;

    const response = await this.client.chat.postMessage({
      ...this.defaults,
      ...this.renderMessage({ subject, markdown }),
      channel: slackChannel,
    });

    return new ActionResult({
      message: `Posted Slack message to channel '${slackChannel}'.`,
      response,
      error: response.error,
    });
  }

}
