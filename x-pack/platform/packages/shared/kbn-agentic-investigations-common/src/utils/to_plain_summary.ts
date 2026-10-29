/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A markdown summary as one line of plain text, for the card's clamped preview. */
export const toPlainSummary = (summary: string): string =>
  summary
    .replace(/^\s*(?:[-*+]|#{1,6})\s+/gm, '')
    .replace(/(\*\*|\*|`)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/(?<![\p{L}\p{N}_])(__|_)(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}_])/gu, '$2')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();

/** The first paragraph of a markdown summary. */
export const firstParagraph = (summary: string): string => summary.trim().split(/\n\s*\n/)[0];
