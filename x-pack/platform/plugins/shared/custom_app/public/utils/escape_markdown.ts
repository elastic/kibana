/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateValue } from '@kbn/custom-app-common';

/**
 * The characters Markdown gives a meaning to that the Markdown of the app lets a backslash take
 * back. Others, such as `=`, cannot be escaped there and mean nothing, so they stay as they are: a
 * backslash before them would be shown. `&` and `<` are written as the entities that are shown as
 * themselves, which also keeps a value from being read as HTML.
 */
const MARKDOWN_CHARACTERS = /[\\`*_{}[\]()#+\-.!|>~]/g;

/** Text that starts with a scheme or a www is made a link on its own, which is not wanted either. */
const AUTOLINK_START = /(https?|ftp):\/\/|www\./gi;

/**
 * Makes text that Markdown shows as it is. A value of the app can come from where the author did
 * not write it, a shared link for one, so it must not be able to bring a link or a heading into the
 * text it is put in.
 */
export const escapeMarkdown = (text: string): string =>
  text
    .replace(/\r?\n/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    // A zero-width space in the scheme or the domain stops it being read as an address.
    .replace(AUTOLINK_START, (start) => `${start.slice(0, 1)}\u200b${start.slice(1)}`)
    .replace(MARKDOWN_CHARACTERS, '\\$&');

/** The values of the app, as they can be put in Markdown. */
export const escapeMarkdownValues = (
  state: Readonly<Record<string, StateValue>>
): Record<string, StateValue> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      typeof value === 'string' ? escapeMarkdown(value) : value,
    ])
  );
