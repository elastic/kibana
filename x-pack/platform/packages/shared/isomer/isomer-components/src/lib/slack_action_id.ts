/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

/** The Slack `action_id` of the element at `index` of its block that raises the event `name`: `{name}:{index}`. */
export const slackActionId = (name: string, index: number): string =>
  `${name}:${index}`.slice(0, SLACK_LIMITS.actionIdChars);
