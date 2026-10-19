/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackContextBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, clampSlackText, escapeMrkdwn } from '@elastic/isomer-sdk/slack';

import { oneLine } from '../../lib';
import type { ContextNode } from './context';

const SLACK_SEPARATOR = '  ·  ';

/** Escapes `raw` for `mrkdwn` and clamps the escaped text, so the cut never lands inside an entity. */
const clampEscaped = (raw: string, max: number): string => {
  let budget = max;
  let escaped = escapeMrkdwn(clampSlackText(raw, budget));
  while (escaped.length > max) {
    budget -= escaped.length - max;
    escaped = escapeMrkdwn(clampSlackText(raw, budget));
  }
  return escaped;
};

const joined = ({ items }: ContextNode, separator: string): string =>
  items.map(({ text }) => oneLine(text)).join(separator);

export const contextSlackRenderer = (node: ContextNode): SlackContextBlock => ({
  type: 'context',
  elements: [
    {
      type: 'mrkdwn',
      text: clampEscaped(joined(node, SLACK_SEPARATOR), SLACK_LIMITS.contextElementChars),
    },
  ],
});
