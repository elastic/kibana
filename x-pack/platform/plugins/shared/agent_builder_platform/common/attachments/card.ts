/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export const CARD_ATTACHMENT_TYPE = 'card' as const;

const MAX_TABLE_CELLS = 10000;

/**
 * The cross-field rules repeat Isomer's, so a card Isomer would refuse fails when the agent creates
 * it, instead of being left out of the message later.
 */
export const cardAttachmentDataSchema = lazySchema(() => {
  const cell = z.union([z.string(), z.number(), z.null()]);

  const button = z
    .strictObject({
      label: z.string().min(1),
      url: z.string().min(1).optional(),
      app: z.string().min(1).optional(),
      path: z.string().min(1).optional(),
      style: z.enum(['primary', 'danger']).optional(),
    })
    .refine(({ url, app }) => Boolean(url) !== Boolean(app), {
      message: 'Give either `url` or `app`.',
    })
    .refine(({ app, path }) => !path || Boolean(app), { message: '`path` needs `app`.' });

  const node = z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('markdown'), text: z.string() }),
    z.strictObject({
      type: z.literal('header'),
      text: z.string().min(1).max(200),
      level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    }),
    z.strictObject({
      type: z.literal('context'),
      items: z
        .array(z.strictObject({ text: z.string().min(1) }))
        .min(1)
        .max(10),
    }),
    z.strictObject({ type: z.literal('divider') }),
    z.strictObject({ type: z.literal('quote'), text: z.string().min(1).max(3000) }),
    z.strictObject({
      type: z.literal('fields'),
      items: z
        .array(z.strictObject({ label: z.string().min(1), value: z.string() }))
        .min(1)
        .max(10),
    }),
    z.strictObject({
      type: z.literal('code'),
      text: z.string().min(1).max(12000),
      language: z.string().optional(),
    }),
    z
      .strictObject({
        type: z.literal('table'),
        columns: z
          .array(
            z.strictObject({
              label: z.string().min(1).max(100),
              align: z.enum(['left', 'right', 'center']).optional(),
            })
          )
          .min(1)
          .max(20),
        rows: z.array(z.array(cell)).min(1).max(1000),
        maxRows: z.number().int().positive().optional(),
      })
      .refine(({ columns, rows }) => rows.every((row) => row.length === columns.length), {
        message: 'Every row needs one cell per column.',
        path: ['rows'],
      })
      .refine(({ columns, rows }) => rows.length * columns.length <= MAX_TABLE_CELLS, {
        message: `A table holds at most ${MAX_TABLE_CELLS} cells (rows times columns).`,
        path: ['rows'],
      }),
    z.strictObject({ type: z.literal('actions'), buttons: z.array(button).min(1).max(5) }),
  ]);

  return z.strictObject({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    body: z.array(node).min(1).max(40),
  });
});

export type CardAttachmentData = z.infer<typeof cardAttachmentDataSchema>;
export type CardNode = CardAttachmentData['body'][number];

export type CardAttachment = Attachment<typeof CARD_ATTACHMENT_TYPE, CardAttachmentData>;
