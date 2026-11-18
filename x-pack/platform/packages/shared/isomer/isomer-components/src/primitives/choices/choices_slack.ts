/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlackActionsBlock,
  SlackOptionObject,
  SlackPlainTextObject,
} from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, clampSlackText } from '@elastic/isomer-sdk/slack';
import { oneLine, slackActionId } from '../../lib';
import type { ChoicesNode } from './choices';

const plain = (text: string): SlackPlainTextObject => ({
  type: 'plain_text',
  text: clampSlackText(oneLine(text), SLACK_LIMITS.optionTextChars),
  emoji: true,
});

const slackOption = ({
  label,
  description,
  value,
}: ChoicesNode['options'][number]): SlackOptionObject => ({
  text: plain(label),
  value,
  ...(description ? { description: plain(description) } : {}),
});

/** Radio buttons, or checkboxes when several options can be chosen, in an `actions` block. */
export const choicesSlackRenderer = ({
  name,
  multiple,
  options,
}: ChoicesNode): SlackActionsBlock => ({
  type: 'actions',
  elements: [
    {
      type: multiple ? 'checkboxes' : 'radio_buttons',
      action_id: slackActionId(name, 0),
      options: options.map(slackOption),
    },
  ],
});
