/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A fragment-only URL always resolves within the same document. Whitespace is refused because URL parsing
// strips it, and percent escapes because browsers decode them, so either could make the browser read a
// different id than this check does.
const FRAGMENT_REFERENCE = /^#([^\s%]+)$/;

/** The id a same-document reference such as `#shape` names, or undefined for any other URL. */
export const getFragmentId = (value: string): string | undefined =>
  FRAGMENT_REFERENCE.exec(value)?.[1];
