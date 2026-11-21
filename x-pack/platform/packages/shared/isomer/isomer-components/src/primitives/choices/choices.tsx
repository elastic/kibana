/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { nodeAnchor, z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import {
  componentIcon,
  definePrimitive,
  eventFallbackSchema,
  eventNameSchema,
  oneLine,
  plainText,
} from '../../lib';
import { choicesSlackRenderer } from './choices_slack';

const optionSchema = z
  .object({
    label: plainText(SLACK_LIMITS.optionTextChars).describe('The option, in a few words.'),
    description: plainText(SLACK_LIMITS.optionTextChars)
      .optional()
      .describe('One line that tells this option from the others.'),
    value: z
      .string()
      .min(1)
      .max(SLACK_LIMITS.optionValueChars)
      .describe('What the host receives when the option is chosen.'),
  })
  .strict();

const choicesSchema = z.object({
  type: z.literal('choices'),
  name: eventNameSchema.describe('The event the host handles when the choice changes.'),
  multiple: z.boolean().optional().describe('Lets the reader choose several options.'),
  options: fromChildren(
    'option',
    z
      .array(optionSchema)
      .min(1)
      .max(SLACK_LIMITS.optionsPerChoice)
      .describe('Options, in order. 1 to 10.'),
    { text: 'label' }
  ),
  fallback: eventFallbackSchema,
});

/** Options the reader chooses from, one or several, for a host that handles the choice. */
export type ChoicesNode = z.infer<typeof choicesSchema> & PrimitiveNode;

const SEPARATOR = ' — ';

const optionLine = ({ label, description }: ChoicesNode['options'][number]): string =>
  description ? `${oneLine(label)}${SEPARATOR}${oneLine(description)}` : oneLine(label);

const example: ChoicesNode = {
  type: 'choices',
  name: 'environment',
  options: [
    { label: 'Production', description: 'Live traffic', value: 'production' },
    { label: 'Staging', value: 'staging' },
  ],
};

// A chosen option above one that isn't.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<circle cx="4" cy="5.5" r="1.75" fill="${accent}"/><circle cx="4" cy="10.5" r="1.25" stroke="${muted}"/><path d="M7.5 5.5h6M7.5 10.5h4.5" stroke="${muted}"/>`
);

const { handles } = isomerDistillery.createStyleModule(
  'componentsChoices',
  ({ css, tokens: { color, font, size } }) => ({
    root: css`
      display: flex;
      flex-direction: column;
      gap: ${size.xs};
      margin: ${size.m} 0;
      padding: 0;
      border: 0;
    `,
    option: css`
      display: flex;
      align-items: baseline;
      gap: ${size.s};
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
    `,
    description: css`
      color: ${color.text.subdued};
    `,
  })
);

export const choices = definePrimitive<ChoicesNode, typeof choicesSchema>({
  type: 'choices',
  schema: choicesSchema,
  catalog: {
    type: 'choices',
    purpose: 'Options the reader chooses from, shown as radio buttons or checkboxes.',
    useWhen: ['The host handles the choice, such as an answer to a question it asked.'],
    avoidWhen: [
      'Nothing handles the choice. List the options in `markdown`.',
      'Each option opens a page. Use `actions`.',
    ],
    example,
  },
  icon,
  examples: [
    example,
    {
      type: 'choices',
      name: 'services',
      multiple: true,
      options: [
        { label: 'checkout', value: 'checkout' },
        { label: 'payments-api', value: 'payments-api' },
      ],
      fallback: 'Reply with the numbers of the services.',
    },
  ],
  renderers: {
    react: (node, { context }) => (
      <fieldset {...nodeAnchor(context, node)} className={classNames(context, handles.root)}>
        {node.options.map((option, index) => (
          <label key={index} className={classNames(context, handles.option)}>
            <input
              type={node.multiple ? 'checkbox' : 'radio'}
              name={node.name}
              value={option.value}
              onChange={({ target: { checked } }) =>
                context.onEvent?.({ name: node.name, context: { value: option.value, checked } })
              }
            />
            <span>{oneLine(option.label)}</span>
            {option.description ? (
              <span className={classNames(context, handles.description)}>
                {oneLine(option.description)}
              </span>
            ) : null}
          </label>
        ))}
      </fieldset>
    ),
    text: ({ options, fallback }) =>
      [
        ...options.map((option, index) => `${index + 1}. ${optionLine(option)}`),
        ...(fallback ? [oneLine(fallback)] : []),
      ].join('\n'),
    markdown: ({ options, fallback }) => [
      md.list(
        options.map((option) => md.paragraph(optionLine(option))),
        { ordered: true }
      ),
      ...(fallback ? [md.paragraph(oneLine(fallback))] : []),
    ],
    slack: choicesSlackRenderer,
  },
});
