/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
// info on nodemailer: https://nodemailer.com/about/
import nodemailer from 'nodemailer';
import { default as MarkdownIt } from 'markdown-it';

import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { CustomHostSettings } from '@kbn/actions-plugin/server/config';
import {
  getNodeSSLOptions,
  getSSLSettingsFromConfig,
} from '@kbn/actions-plugin/server/lib/get_node_ssl_options';
import {
  ConnectorUsageCollector,
  ConnectorTokenClientContract,
  ProxySettings,
} from '@kbn/actions-plugin/server/types';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { AdditionalEmailServices } from '../../../common';
import { sendEmailGraphApi } from './send_email_graph_api';

// an email "service" which doesn't actually send, just returns what it would send
export const JSON_TRANSPORT_SERVICE = '__json';
// The value is the resource identifier (Application ID URI) of the resource you want, affixed with the .default suffix. For Microsoft Graph, the value is https://graph.microsoft.com/.default. This value informs the Microsoft identity platform endpoint that of all the application permissions you have configured for your app in the app registration portal, it should issue a token for the ones associated with the resource you want to use.

export interface SendEmailOptions {
  connectorId: string;
  transport: Transport;
  routing: Routing;
  content: Content;
  hasAuth: boolean;
  configurationUtilities: ActionsConfigurationUtilities;
}

// config validation ensures either service is set or host/port are set
export interface Transport {
  user?: string;
  password?: string;
  service?: string; // see: https://nodemailer.com/smtp/well-known/
  host?: string;
  port?: number;
  secure?: boolean; // see: https://nodemailer.com/smtp/#tls-options
  // OAuth 2.0 Client Credentials flow options
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  oauthTokenUrl?: string;
}

export interface Routing {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface Content {
  subject: string;
  message: string;
  messageHTML?: string | null;
}

export async function sendEmail(
  logger: Logger,
  options: SendEmailOptions,
  connectorTokenClient: ConnectorTokenClientContract,
  connectorUsageCollector: ConnectorUsageCollector
): Promise<unknown> {
  const { transport, content } = options;
  const { message, messageHTML } = content;

  const renderedMessage = messageHTML ?? htmlFromMarkdown(logger, message);

  if (transport.service === AdditionalEmailServices.EXCHANGE) {
    return await sendEmailWithExchange(
      logger,
      options,
      renderedMessage,
      connectorTokenClient,
      connectorUsageCollector
    );
  } else {
    return await sendEmailWithNodemailer(logger, options, renderedMessage, connectorUsageCollector);
  }
}

// send an email using MS Exchange Graph API
export async function sendEmailWithExchange(
  logger: Logger,
  options: SendEmailOptions,
  messageHTML: string,
  connectorTokenClient: ConnectorTokenClientContract,
  connectorUsageCollector: ConnectorUsageCollector
): Promise<unknown> {
  const { transport, configurationUtilities, connectorId } = options;
  const { clientId, clientSecret, tenantId, oauthTokenUrl } = transport;

  let tokenUrl = oauthTokenUrl;
  if (!tokenUrl) {
    const exchangeUrl = configurationUtilities.getMicrosoftExchangeUrl();
    tokenUrl = `${exchangeUrl}/${tenantId}/oauth2/v2.0/token`;
  }

  const accessToken = await getOAuthClientCredentialsAccessToken({
    connectorId,
    logger,
    configurationUtilities,
    credentials: {
      config: {
        clientId: clientId as string,
        tenantId: tenantId as string,
      },
      secrets: {
        clientSecret: clientSecret as string,
      },
    },
    oAuthScope: configurationUtilities.getMicrosoftGraphApiScope(),
    tokenUrl,
    connectorTokenClient,
  });

  if (!accessToken) {
    throw new Error(`Unable to retrieve access token for connectorId: ${connectorId}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: accessToken,
  };

  const axiosInstance = axios.create();
  axiosInstance.interceptors.response.use(
    async (response: AxiosResponse) => {
      // Look for 4xx errors that indicate something is wrong with the request
      // We don't know for sure that it is an access token issue but remove saved
      // token just to be sure
      if (response.status >= 400 && response.status < 500) {
        await connectorTokenClient.deleteConnectorTokens({ connectorId });
      }
      return response;
    },
    async (error) => {
      const statusCode = error?.response?.status;

      // Look for 4xx errors that indicate something is wrong with the request
      // We don't know for sure that it is an access token issue but remove saved
      // token just to be sure
      if (statusCode >= 400 && statusCode < 500) {
        await connectorTokenClient.deleteConnectorTokens({ connectorId });
      }
      return Promise.reject(error);
    }
  );

  return await sendEmailGraphApi(
    {
      options,
      headers,
      messageHTML,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector,
    axiosInstance
  );
}

// send an email using nodemailer
async function sendEmailWithNodemailer(
  logger: Logger,
  options: SendEmailOptions,
  messageHTML: string,
  connectorUsageCollector: ConnectorUsageCollector
): Promise<unknown> {
  const { transport, routing, content, configurationUtilities, hasAuth } = options;
  const { service } = transport;
  const { from, to, cc, bcc } = routing;
  const { subject, message } = content;

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

  // The transport options do not seem to be exposed as a type, and we reference
  // some deep properties, so need to use any here.
  const transportConfig = getTransportConfig(configurationUtilities, logger, transport, hasAuth);
  const nodemailerTransport = nodemailer.createTransport(transportConfig);
  connectorUsageCollector.addRequestBodyBytes(undefined, email);
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

function getTransportConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  transport: Transport,
  hasAuth: boolean
) {
  const { service, host, port, secure, user, password } = transport;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transportConfig: Record<string, any> = {};
  const proxySettings = configurationUtilities.getProxySettings();
  const generalSSLSettings = configurationUtilities.getSSLSettings();

  if (hasAuth && user != null && password != null) {
    transportConfig.auth = {
      user,
      pass: password,
    };
  }

  const useProxy = getUseProxy(host, proxySettings);
  let customHostSettings: CustomHostSettings | undefined;

  if (service === JSON_TRANSPORT_SERVICE) {
    transportConfig.jsonTransport = true;
    delete transportConfig.auth;
  } else if (service != null && service !== AdditionalEmailServices.OTHER) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = !!secure;
    customHostSettings = configurationUtilities.getCustomHostSettings(`smtp://${host}:${port}`);

    if (proxySettings && useProxy) {
      transportConfig.tls = getNodeSSLOptions(
        logger,
        proxySettings?.proxySSLSettings.verificationMode
      );
      transportConfig.proxy = proxySettings.proxyUrl;
      transportConfig.headers = proxySettings.proxyHeaders;
    } else if (!transportConfig.secure && user == null && password == null) {
      // special case - if secure:false && user:null && password:null set
      // rejectUnauthorized false, because simple/test servers that don't even
      // authenticate rarely have valid certs; eg cloud proxy, and npm maildev
      transportConfig.tls = { rejectUnauthorized: false };
    } else {
      transportConfig.tls = getNodeSSLOptions(logger, generalSSLSettings.verificationMode);
    }

    // finally, allow customHostSettings to override some of the settings
    // see: https://nodemailer.com/smtp/
    if (customHostSettings) {
      const tlsConfig: Record<string, unknown> = {};
      const sslSettings = customHostSettings.ssl;
      const smtpSettings = customHostSettings.smtp;

      if (sslSettings?.certificateAuthoritiesData) {
        tlsConfig.ca = sslSettings?.certificateAuthoritiesData;
      }

      const sslSettingsFromConfig = getSSLSettingsFromConfig(sslSettings?.verificationMode);
      const nodeTLSOptions = getNodeSSLOptions(logger, sslSettingsFromConfig.verificationMode);
      if (!transportConfig.tls) {
        transportConfig.tls = { ...tlsConfig, ...nodeTLSOptions };
      } else {
        transportConfig.tls = { ...transportConfig.tls, ...tlsConfig, ...nodeTLSOptions };
      }

      if (smtpSettings?.ignoreTLS) {
        transportConfig.ignoreTLS = true;
      } else if (smtpSettings?.requireTLS) {
        transportConfig.requireTLS = true;
      }
    }
  }
  return transportConfig;
}

function getUseProxy(host?: string, proxySettings?: ProxySettings) {
  if (host) {
    if (proxySettings?.proxyBypassHosts && proxySettings?.proxyBypassHosts?.has(host)) {
      return false;
    }
    if (proxySettings?.proxyOnlyHosts && !proxySettings?.proxyOnlyHosts?.has(host)) {
      return false;
    }
  }
  return !!proxySettings;
}
