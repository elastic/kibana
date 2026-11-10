/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, link as mrkdwnLink } from '@elastic/isomer-sdk/slack';

import { oneLine } from '../../lib';
import type { LinkNode } from './link';
import { slackLinkHref } from './resolve_link';

/**
 * An inline link in a `section`. A URL whose escaped `mrkdwn` would pass the section's limit, such
 * as a long query full of `&`, goes in a `rich_text` link instead, which needs no escaping.
 */
export const linkSlackRenderer = (
  node: LinkNode,
  { baseUrl }: { baseUrl?: string }
): SlackBlock | readonly SlackBlock[] => {
  const url = slackLinkHref(node, baseUrl);
  if (!url || url.length > SLACK_LIMITS.urlChars) {
    return [];
  }
  const label = oneLine(node.label);
  const text = mrkdwnLink(url, label);
  if (text.length <= SLACK_LIMITS.sectionTextChars) {
    return { type: 'section', text: { type: 'mrkdwn', text } };
  }
  return {
    type: 'rich_text',
    elements: [{ type: 'rich_text_section', elements: [{ type: 'link', url, text: label }] }],
  };
};
