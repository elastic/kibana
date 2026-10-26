/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SLACK_RESPONSE_URL_PREFIX = 'https://hooks.slack.com/';

export function isSlackResponseUrl(url: string): boolean {
  return url.startsWith(SLACK_RESPONSE_URL_PREFIX);
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
 * Failures are swallowed — resume already committed.
 */
export async function replaceSlackHitlMessage(params: {
  responseUrl: string;
  text: string;
  /** Visible only to the clicker. Leaves the original controls in place. */
  ephemeral?: boolean;
}): Promise<void> {
  if (!isSlackResponseUrl(params.responseUrl)) {
    return;
  }

  const body = params.ephemeral
    ? { response_type: 'ephemeral', replace_original: false, text: params.text }
    : { replace_original: true, text: params.text };

  try {
    await fetch(params.responseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {
    // Best-effort UX only.
  }
}
