/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_MENTIONS_PER_COMMENT } from '../constants';

/** Matches `@[display name](profile uid)`; the uid is what gets indexed and notified. */
export const MENTION_TOKEN_PATTERN = '@\\[([^\\]\\n]{1,256})\\]\\(([\\w-]{1,256})\\)';

/** Returns the unique profile uids mentioned in a markdown comment. */
export const parseMentions = (content: string): string[] => {
  const uids = new Set<string>();

  for (const [, , uid] of content.matchAll(new RegExp(MENTION_TOKEN_PATTERN, 'g'))) {
    uids.add(uid);

    if (uids.size >= MAX_MENTIONS_PER_COMMENT) {
      break;
    }
  }

  return [...uids];
};

/** Builds the markdown token for a mention. */
export const toMentionToken = ({ name, uid }: { name: string; uid: string }): string =>
  `@[${name.replace(/[\]\n]/g, ' ').trim()}](${uid})`;
