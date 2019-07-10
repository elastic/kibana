/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// info on nodemailer: https://nodemailer.com/about/
import nodemailer from 'nodemailer';

// an email "service" which doesn't actually send, just returns what it would send
export const JSON_TRANSPORT_SERVICE = '__json';

interface SendEmailOptions {
  transport: Transport;
  routing: Routing;
  content: Content;
}

// config validation ensures either service is set or host/port are set
interface Transport {
  service?: string; // see: https://nodemailer.com/smtp/well-known/
  host?: string;
  port?: number;
  secure?: boolean; // see: https://nodemailer.com/smtp/#tls-options
  user: string;
  password: string;
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
export async function sendEmail(options: SendEmailOptions): Promise<any> {
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

  const email = {
    // email routing
    from,
    to,
    cc,
    bcc,
    // email content
    subject,
    html: message,
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
