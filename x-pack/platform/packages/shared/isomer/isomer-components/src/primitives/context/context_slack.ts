/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackContextBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { clampEscapedMrkdwn, oneLine } from '../../lib';
import type { ContextNode } from './context';

const SLACK_SEPARATOR = '  ·  ';

const joined = ({ items }: ContextNode, separator: string): string =>
  items.map(({ text }) => oneLine(text)).join(separator);

export const contextSlackRenderer = (node: ContextNode): SlackContextBlock => ({
  type: 'context',
  elements: [
    {
      type: 'mrkdwn',
      text: clampEscapedMrkdwn(joined(node, SLACK_SEPARATOR), SLACK_LIMITS.contextElementChars),
    },
  ],
});
