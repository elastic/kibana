/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodemailer from 'nodemailer';

import { Action, ActionResult } from '../';

export const EMAIL_ACTION_ID = 'xpack-notifications-email';

/**
 * Email Action enables generic sending of emails, when configured.
 */
export class EmailAction extends Action {

  /**
   * Create a new Action capable of sending emails.
   *
   * @param {Object} server Kibana server object.
   * @param {Object} options Configuration options for Nodemailer.
   * @param {Object} defaults Default fields used when sending emails.
   * @param {Object} _nodemailer Exposed for tests.
   */
  constructor({ server, options, defaults = { }, _nodemailer = nodemailer }) {
    super({ server, id: EMAIL_ACTION_ID, name: 'Email' });

    this.transporter = _nodemailer.createTransport(options, defaults);
    this.defaults = defaults;
  }

  getMissingFields(notification) {
    const missingFields = [];

    if (!Boolean(this.defaults.to) && !Boolean(notification.to)) {
      missingFields.push({
        field: 'to',
        name: 'To',
        type: 'email',
      });
    }

    if (!Boolean(this.defaults.from) && !Boolean(notification.from)) {
      missingFields.push({
        field: 'from',
        name: 'From',
        type: 'email',
      });
    }

    if (!Boolean(notification.subject)) {
      missingFields.push({
        field: 'subject',
        name: 'Subject',
        type: 'text',
      });
    }

    if (!Boolean(notification.markdown)) {
      missingFields.push({
        field: 'markdown',
        name: 'Body',
        type: 'markdown',
      });
    }

    return missingFields;
  }

  async doPerformHealthCheck() {
    // this responds with a boolean 'true' response, otherwise throws an Error
    const response = await this.transporter.verify();

    return new ActionResult({
      message: `Email action SMTP configuration has been verified.`,
      response: {
        verified: response
      },
    });
  }

  async doPerformAction(notification) {
    // Note: This throws an Error upon failure
    const response = await this.transporter.sendMail({
      // email routing
      from: notification.from,
      to: notification.to,
      cc: notification.cc,
      bcc: notification.bcc,
      // email content
      subject: notification.subject,
      html: notification.markdown,
      text: notification.markdown,
    });

    return new ActionResult({
      message: `Sent email for '${notification.subject}'.`,
      response,
    });
  }

}
