/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock, SlackRichTextBlockElement } from '@elastic/isomer-sdk/slack';

// The SDK's `slack` entry exports the `SlackBlock` union but no longer each block's type.
type BlockOf<TType extends SlackBlock['type']> = Extract<SlackBlock, { type: TType }>;

export type SlackActionsBlock = BlockOf<'actions'>;
export type SlackButtonElement = Extract<SlackActionsBlock['elements'][number], { type: 'button' }>;
export type SlackContextBlock = BlockOf<'context'>;
export type SlackRichTextBlock = BlockOf<'rich_text'>;
export type SlackRichTextPreformatted = Extract<
  SlackRichTextBlockElement,
  { type: 'rich_text_preformatted' }
>;
export type SlackSectionBlock = BlockOf<'section'>;
export type SlackTableBlock = BlockOf<'table'>;
