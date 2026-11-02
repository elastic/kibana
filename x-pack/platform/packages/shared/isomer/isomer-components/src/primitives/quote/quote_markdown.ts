/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';

import type { QuoteNode } from './quote';

const LINE_BREAK = /\r?\n/;

const paragraphs = (text: string): string[] => text.trim().split(/(?:\r?\n\s*){2,}/);

export const quoteMarkdownRenderer = ({ text }: QuoteNode) =>
  md.blockquote(
    ...paragraphs(text).map((paragraph) =>
      md.paragraph(
        ...paragraph
          .split(LINE_BREAK)
          .flatMap((line, index) => (index > 0 ? [md.break(), line] : [line]))
      )
    )
  );
