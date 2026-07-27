/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { parse as parseYaml } from 'yaml';

export interface SplitFrontmatterResult {
  frontmatter: Record<string, unknown> | null;
  body: string;
}

const FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?---[ \t]*(?:\r?\n([\s\S]*))?$/;

const frontmatterObjectSchema = z.record(z.string(), z.unknown());

/**
 * Splits raw `SKILL.md` content into its YAML frontmatter object and the
 * markdown body.
 *
 * @param rawContent - Raw contents of a `SKILL.md` file.
 * @returns The parsed `frontmatter` object alongside the trimmed markdown
 * `body`.
 */
export const splitFrontmatter = (rawContent: string): SplitFrontmatterResult => {
  const match = rawContent.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: null,
      body: rawContent.trim(),
    };
  }

  const [, frontmatterRaw = '', rawBody = ''] = match;
  const body = rawBody.trim();

  let loaded: unknown;
  try {
    loaded = parseYaml(frontmatterRaw) ?? {};
  } catch {
    return { frontmatter: null, body };
  }

  const parsed = frontmatterObjectSchema.safeParse(loaded);

  return {
    frontmatter: parsed.success ? parsed.data : null,
    body,
  };
};
