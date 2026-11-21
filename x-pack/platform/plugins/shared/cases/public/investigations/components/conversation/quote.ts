/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The Cases quote: every line prefixed with `> `, followed by a blank line. */
export const toQuote = (content: string): string => `> ${content.replace(/\r?\n/g, '\n> ')} \n\n`;

/** Appends a quote to a draft the way the Cases "Quote" action does. */
export const appendQuote = (draft: string, content: string): string =>
  `${draft}${draft.length > 0 ? '\n\n' : ''}${toQuote(content)}`;
