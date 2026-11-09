/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AppendRoutingTagResult {
  tags: string[];
  /** `false` when the tag was already present and `tags` is a copy of the input. */
  changed: boolean;
}

/**
 * Adds `tag` after the existing tags, keeping them in place. Idempotent: a tag that is
 * already present is not added again.
 */
export const appendRoutingTag = (
  existingTags: readonly string[] | null | undefined,
  tag: string
): AppendRoutingTagResult => {
  const tags = existingTags ?? [];
  if (tags.includes(tag)) {
    return { tags: [...tags], changed: false };
  }
  return { tags: [...tags, tag], changed: true };
};
