/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackSectionBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, bold } from '@elastic/isomer-sdk/slack';

import { clampEscapedMrkdwn } from '../../lib';
import { fieldEntries } from './field_entries';
import type { FieldsNode } from './fields';

/** One section, a `mrkdwn` field per item: the label in bold over its value. */
export const fieldsSlackRenderer = (node: FieldsNode): SlackSectionBlock => ({
  type: 'section',
  fields: fieldEntries(node).map(({ label, value }) => {
    const heading = `${bold(label)}\n`;
    return {
      type: 'mrkdwn',
      text: `${heading}${clampEscapedMrkdwn(
        value,
        SLACK_LIMITS.sectionFieldChars - heading.length
      )}`,
      // Plain text must not trigger Slack's automatic `@here`/`#channel` parsing.
      verbatim: true,
    };
  }),
});
