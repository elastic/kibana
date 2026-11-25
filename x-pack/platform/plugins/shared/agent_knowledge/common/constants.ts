/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Wiki ids and page types appear in stored document ids, so they keep to a closed alphabet. */
export const WIKI_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
export const PAGE_TYPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * A page key is the stable id of what the page is about, such as a saved-object id. The shared
 * page store lowercases a slug and turns anything but letters, digits and `-` into `-`, so a key
 * is limited to what it keeps as is: two keys never collapse into one page.
 */
export const PAGE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
export const MAX_PAGE_KEY_LENGTH = 80;

/** An entry id is unique within its page; recording the same id twice changes nothing. */
export const ENTRY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const MAX_ENTRY_ID_LENGTH = 128;

export const MAX_PAGE_TITLE_LENGTH = 512;
export const MAX_ENTRY_LENGTH = 16_000;

/**
 * A page is read whole into an agent message, so it has a ceiling. An entry that would take the
 * page past it is refused rather than truncated: dropping recorded decisions silently is worse
 * than a visible failure.
 */
export const MAX_PAGE_CONTENT_LENGTH = 100_000;
