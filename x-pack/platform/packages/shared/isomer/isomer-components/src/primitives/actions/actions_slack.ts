/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackActionsBlock, SlackBlock, SlackButtonElement } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, clampSlackText, slackLinkUrl } from '@elastic/isomer-sdk/slack';
import type { ActionsNode } from './actions';
import { oneLine } from '../../lib';

type ActionsButton = ActionsNode['buttons'][number];

const slackButton = ({ label, url, primary }: ActionsButton): SlackButtonElement[] => {
  const href = slackLinkUrl(url);
  if (!href) {
    return [];
  }
  return [
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text: clampSlackText(oneLine(label), SLACK_LIMITS.buttonTextChars),
        emoji: true,
      },
      url: href,
      ...(primary ? { style: 'primary' as const } : {}),
    },
  ];
};
export const actionsSlackRenderer = ({
  buttons,
}: ActionsNode): SlackActionsBlock | readonly SlackBlock[] => {
  const elements = buttons.flatMap(slackButton);
  if (elements.length === 0) {
    return [];
  }
  return { type: 'actions', elements };
};
