/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackSectionBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, bold, clampSlackText } from '@elastic/isomer-sdk/slack';

import { clampEscapedMrkdwn } from '../../lib';
import { fieldEntries } from './field_entries';
import type { FieldsNode } from './fields';

const toField = ({ label, value }: { label: string; value: string }) => {
  const heading = `${bold(clampSlackText(label, SLACK_LIMITS.headerTextChars))}\n`;
  return {
    type: 'mrkdwn' as const,
    text: `${heading}${clampEscapedMrkdwn(value, SLACK_LIMITS.sectionFieldChars - heading.length)}`,
    // Plain text must not trigger Slack's automatic `@here`/`#channel` parsing.
    verbatim: true,
  };
};

/**
 * A section per 10 items, the most fields Slack takes in one, with a `mrkdwn` field per item: the
 * label in bold over its value.
 */
export const fieldsSlackRenderer = (node: FieldsNode): SlackSectionBlock[] => {
  const fields = fieldEntries(node).map(toField);

  return Array.from(
    { length: Math.ceil(fields.length / SLACK_LIMITS.fieldsPerSection) },
    (_, index) => ({
      type: 'section' as const,
      fields: fields.slice(
        index * SLACK_LIMITS.fieldsPerSection,
        (index + 1) * SLACK_LIMITS.fieldsPerSection
      ),
    })
  );
};
