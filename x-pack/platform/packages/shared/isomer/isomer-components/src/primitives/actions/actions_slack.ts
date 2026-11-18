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
import { slackAppHref } from '../link/resolve_link';

type ActionsButton = ActionsNode['buttons'][number];

/** The Slack `action_id` of the element at `index` of its block that raises the event `name`: `{name}:{index}`. */
export const slackActionId = (name: string, index: number): string =>
  `${name}:${index}`.slice(0, SLACK_LIMITS.actionIdChars);

const slackButtonHref = ({ url, app, path }: ActionsButton, baseUrl: string | undefined) => {
  if (url !== undefined) {
    return slackLinkUrl(url);
  }
  return app === undefined ? null : slackAppHref({ app, path }, baseUrl);
};

const slackButtonStyle = ({ primary, danger }: ActionsButton) => {
  if (danger) {
    return { style: 'danger' as const };
  }
  return primary ? { style: 'primary' as const } : {};
};

/** The event as `action_id` and `value`, or nothing when its context is past Slack's value limit. */
const slackButtonEvent = (
  { name, context }: NonNullable<ActionsButton['event']>,
  index: number
): Pick<SlackButtonElement, 'action_id' | 'value'> | null => {
  const value = context === undefined ? undefined : JSON.stringify(context);

  if (value !== undefined && value.length > SLACK_LIMITS.buttonValueChars) {
    return null;
  }
  return { action_id: slackActionId(name, index), ...(value === undefined ? {} : { value }) };
};

const slackButtonTarget = (
  button: ActionsButton,
  index: number,
  baseUrl: string | undefined
): Pick<SlackButtonElement, 'action_id' | 'value' | 'url'> | null => {
  if (button.event) {
    return slackButtonEvent(button.event, index);
  }
  const href = slackButtonHref(button, baseUrl);

  return href ? { url: href } : null;
};

const slackButton = (
  button: ActionsButton,
  index: number,
  baseUrl: string | undefined
): SlackButtonElement[] => {
  const target = slackButtonTarget(button, index, baseUrl);
  if (!target) {
    return [];
  }
  return [
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text: clampSlackText(oneLine(button.label), SLACK_LIMITS.buttonTextChars),
        emoji: true,
      },
      ...target,
      ...slackButtonStyle(button),
    },
  ];
};
export const actionsSlackRenderer = (
  { buttons }: ActionsNode,
  { baseUrl }: { baseUrl?: string }
): SlackActionsBlock | readonly SlackBlock[] => {
  const elements = buttons.flatMap((button, index) => slackButton(button, index, baseUrl));
  if (elements.length === 0) {
    return [];
  }
  return { type: 'actions', elements };
};
