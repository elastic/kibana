/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request as httpsRequest } from 'node:https';
import { getCustomAgents } from '@kbn/actions-utils';
import type { CustomHostSettings, ProxySettings, SSLSettings } from '@kbn/actions-utils';
import type { Logger } from '@kbn/core/server';

const SLACK_RESPONSE_URL_PREFIXES = ['https://hooks.slack.com/', 'https://hooks.slack-gov.com/'];

/** Stay inside Slack's 3s interactivity window after the resume has already been committed. */
const SLACK_HITL_RESPONSE_TIMEOUT_MS = 2000;

export interface SlackHitlResponseHttpConfig {
  isUriAllowed: (uri: string) => boolean;
  getProxySettings: () => ProxySettings | undefined;
  getSSLSettings: () => SSLSettings;
  getCustomHostSettings: (targetUrl: string) => CustomHostSettings | undefined;
}

export function isSlackResponseUrl(url: string): boolean {
  return SLACK_RESPONSE_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function buildHitlSlackConfirmationText(params: {
  kind?: unknown;
  approved?: unknown;
  slackUserId?: unknown;
  alreadyResponded?: boolean;
}): string {
  const userSuffix =
    typeof params.slackUserId === 'string' && params.slackUserId.length > 0
      ? ` by <@${params.slackUserId}>`
      : '';

  if (params.alreadyResponded) {
    return 'This request was already responded to.';
  }

  if (params.kind === 'approval') {
    return params.approved === true ? `Approved${userSuffix}.` : `Declined${userSuffix}.`;
  }

  if (params.kind === 'input') {
    return `Submitted${userSuffix}.`;
  }

  return `Responded${userSuffix}.`;
}

/**
 * Replaces the interactive Slack message via response_url so buttons cannot be reused.
 * Egress uses Actions proxy, CA, and allowedHosts settings. Failures are swallowed — resume already committed.
 */
export async function replaceSlackHitlMessage(params: {
  responseUrl: string;
  text: string;
  /** Visible only to the clicker. Leaves the original controls in place. */
  ephemeral?: boolean;
  configurationUtilities: SlackHitlResponseHttpConfig;
  logger: Logger;
}): Promise<void> {
  if (!isSlackResponseUrl(params.responseUrl)) {
    return;
  }

  try {
    if (!params.configurationUtilities.isUriAllowed(params.responseUrl)) {
      return;
    }

    // The path is the secret. The agent helper logs this URL when custom-host SSL is set.
    const responseOrigin = new URL(params.responseUrl).origin;
    const { httpsAgent } = getCustomAgents({
      customHostSettings: params.configurationUtilities.getCustomHostSettings(responseOrigin),
      logger: params.logger,
      proxySettings: params.configurationUtilities.getProxySettings(),
      sslSettings: params.configurationUtilities.getSSLSettings(),
      url: responseOrigin,
    });

    const body = params.ephemeral
      ? { response_type: 'ephemeral', replace_original: false, text: params.text }
      : { replace_original: true, text: params.text };
    const payload = JSON.stringify(body);

    // fetch() cannot use the Actions https.Agent (proxy and custom CA).
    await new Promise<void>((resolve, reject) => {
      const controller = new AbortController();
      const deadline = setTimeout(() => {
        controller.abort();
      }, SLACK_HITL_RESPONSE_TIMEOUT_MS);
      const finish = (error?: Error) => {
        clearTimeout(deadline);
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      const req = httpsRequest(
        params.responseUrl,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'content-length': Buffer.byteLength(payload),
          },
          agent: httpsAgent,
          signal: controller.signal,
        },
        (res) => {
          res.resume();
          res.on('error', (error) => finish(error));
          res.on('end', () => finish());
        }
      );
      req.on('error', (error) => finish(error));
      req.end(payload);
    });
  } catch {
    // The response_url embeds a secret. Keep the log free of the URL and the request error.
    params.logger.warn('Failed to replace the Slack HITL message');
  }
}
