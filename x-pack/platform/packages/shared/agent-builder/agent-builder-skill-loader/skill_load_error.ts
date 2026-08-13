/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reason a skill could not be loaded:
 * - `missing_skill_file`: the directory has no top-level `SKILL.md`, or the path is
 *   not a directory at all.
 * - `invalid_frontmatter`: `SKILL.md` has no frontmatter block, the block is not a
 *   YAML mapping, or its `name`, `description`, `id`, or `experimental` values are
 *   unusable.
 * - `invalid_reference_name`: a markdown file or one of its directory segments has a
 *   name the skills directory structure cannot represent.
 * - `empty_reference`: a referenced markdown file has no content.
 * - `too_many_references`: the directory holds more referenced files than a skill
 *   definition allows.
 * - `invalid_definition`: the assembled skill failed `skillDefinitionSchema`.
 */
export type SkillLoadErrorCode =
  | 'missing_skill_file'
  | 'invalid_frontmatter'
  | 'invalid_reference_name'
  | 'empty_reference'
  | 'too_many_references'
  | 'invalid_definition';

export class SkillLoadError extends Error {
  constructor(public readonly code: SkillLoadErrorCode, message: string) {
    super(message);
    this.name = 'SkillLoadError';
  }
}
