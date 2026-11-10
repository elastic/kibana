/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Neutralises untrusted text interpolated into the hovers the workflow editor renders as trusted
 * Markdown with HTML (raw tags, links, `command:` URIs). The same message is also shown as a plain
 * marker, so only characters that can start HTML, a link, or code are encoded: names such as
 * `my-pack_v1.2` read the same in both places.
 */
export const escapeMarkdown = (value: string): string =>
  value.replace(/[&<>[\]()\\`]/g, (character) => `&#${character.charCodeAt(0)};`);
