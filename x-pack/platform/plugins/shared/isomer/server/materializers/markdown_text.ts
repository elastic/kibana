/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One line of text that reads the same as a Markdown link's text: the characters that would end
 * it, or start emphasis, code or HTML inside it, escaped.
 */
export const escapeMarkdownText = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>]/g, '\\$&');

/** A URL as a Markdown link or image destination: the characters that would end it encoded. */
export const markdownDestination = (url: string): string =>
  url.replace(
    /[\s()<>]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  );

const ABSOLUTE_HTTP = /^https?:\/\//i;

/** Whether `url` is an absolute http(s) URL, which every surface can open without a host. */
export const isAbsoluteHttpUrl = (url: string): boolean => {
  if (!ABSOLUTE_HTTP.test(url)) {
    return false;
  }
  try {
    return Boolean(new URL(url).host);
  } catch {
    return false;
  }
};
