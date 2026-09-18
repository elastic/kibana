/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { parse as parseYaml } from 'yaml';

export type SplitFrontmatterResult =
  | { frontmatter: Record<string, unknown>; body: string; error?: never }
  | { frontmatter: null; body: string; error?: string };

const FRONTMATTER_REGEX = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n([\s\S]*))?$/;
const BYTE_ORDER_MARK = '\uFEFF';

const frontmatterObjectSchema = z.record(z.string(), z.unknown());

/**
 * Splits raw `SKILL.md` content into its YAML frontmatter object and the
 * markdown body.
 *
 * @param rawContent - Raw contents of a `SKILL.md` file.
 * @returns The parsed frontmatter and markdown body, per {@link SplitFrontmatterResult}.
 */
export const splitFrontmatter = (rawContent: string): SplitFrontmatterResult => {
  const content = rawContent.startsWith(BYTE_ORDER_MARK)
    ? rawContent.slice(BYTE_ORDER_MARK.length)
    : rawContent;

  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: null,
      body: content.trim(),
    };
  }

  const [, frontmatterRaw = '', rawBody = ''] = match;
  const body = rawBody.trim();

  let loaded: unknown;
  try {
    loaded = parseYaml(frontmatterRaw) ?? {};
  } catch (yamlError) {
    return { frontmatter: null, body, error: toYamlErrorReason(yamlError) };
  }

  const parsed = frontmatterObjectSchema.safeParse(loaded);
  if (!parsed.success) {
    return { frontmatter: null, body, error: 'frontmatter must be a mapping of keys to values' };
  }

  return { frontmatter: parsed.data, body };
};

const toYamlErrorReason = (yamlError: unknown): string => {
  const message = yamlError instanceof Error ? yamlError.message : String(yamlError);
  const [firstLine = ''] = message.split('\n');
  return firstLine.replace(/:$/, '');
};
