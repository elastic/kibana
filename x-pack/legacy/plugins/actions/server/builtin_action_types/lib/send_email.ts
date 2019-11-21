/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// info on nodemailer: https://nodemailer.com/about/
import nodemailer from 'nodemailer';

import { default as MarkdownIt } from 'markdown-it';

import { Logger } from '../../../../../../../src/core/server';

// an email "service" which doesn't actually send, just returns what it would send
export const JSON_TRANSPORT_SERVICE = '__json';

interface SendEmailOptions {
  transport: Transport;
  routing: Routing;
  content: Content;
}

// config validation ensures either service is set or host/port are set
interface Transport {
  user: string;
  password: string;
  service?: string; // see: https://nodemailer.com/smtp/well-known/
  host?: string;
  port?: number;
  secure?: boolean; // see: https://nodemailer.com/smtp/#tls-options
}

interface Routing {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
}

interface Content {
  subject: string;
  message: string;
}

// send an email
export async function sendEmail(logger: Logger, options: SendEmailOptions): Promise<any> {
  const { transport, routing, content } = options;
  const { service, host, port, secure, user, password } = transport;
  const { from, to, cc, bcc } = routing;
  const { subject, message } = content;

  const transportConfig: Record<string, any> = {
    auth: {
      user,
      pass: password,
    },
  };

  if (service === JSON_TRANSPORT_SERVICE) {
    transportConfig.jsonTransport = true;
    delete transportConfig.auth;
  } else if (service != null) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = !!secure;
  }

  const nodemailerTransport = nodemailer.createTransport(transportConfig);
  const messageHTML = htmlFromMarkdown(logger, message);

  const email = {
    // email routing
    from,
    to,
    cc,
    bcc,
    // email content
    subject,
    html: messageHTML,
    text: message,
  };

  const result = await nodemailerTransport.sendMail(email);

  if (service === JSON_TRANSPORT_SERVICE) {
    try {
      result.message = JSON.parse(result.message);
    } catch (err) {
      // try parsing the message for ease of debugging, on error, ignore
    }
  }

  return result;
}

// try rendering markdown to html, return markdown on any kind of error
function htmlFromMarkdown(logger: Logger, markdown: string) {
  try {
    const md = MarkdownIt({
      linkify: true,
    });

    return md.render(markdown);
  } catch (err) {
    logger.debug(`error rendering markdown to html: ${err.message}`);

    return markdown;
  }
}
