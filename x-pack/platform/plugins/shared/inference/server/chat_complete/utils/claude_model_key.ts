/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minor versions are at most two digits, so a trailing date (`-20250929`) is not read as one.
const CLAUDE_VARIANT_FIRST_PATTERN = /-claude-(haiku|sonnet|opus|fable|mythos)-(\d+(?:-\d{1,2})?)-/;
const CLAUDE_VERSION_FIRST_PATTERN = /-claude-(\d+(?:-\d{1,2})?)-(haiku|sonnet|opus|fable|mythos)-/;

const normalizeModelId = (modelId: string) =>
  `-${modelId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-`;

export const isClaudeModelId = (modelId: string): boolean =>
  normalizeModelId(modelId).includes('-claude-');

/**
 * Providers order Claude model names differently (`claude-sonnet-4-5`, `anthropic-claude-4.5-sonnet`,
 * `eu.anthropic.claude-sonnet-5-5`), so convert them to one `<variant>-<version>` key before
 * checking support. Returns `undefined` for non-Claude models or unparseable Claude ids.
 */
export const getClaudeModelKey = (modelId: string): string | undefined => {
  const normalizedModelId = normalizeModelId(modelId);

  const variantFirstMatch = normalizedModelId.match(CLAUDE_VARIANT_FIRST_PATTERN);
  if (variantFirstMatch) {
    const [, variant, version] = variantFirstMatch;
    return `${variant}-${version}`;
  }

  // EIS model IDs put the version before the variant.
  const versionFirstMatch = normalizedModelId.match(CLAUDE_VERSION_FIRST_PATTERN);
  if (versionFirstMatch) {
    const [, version, variant] = versionFirstMatch;
    return `${variant}-${version}`;
  }
};
