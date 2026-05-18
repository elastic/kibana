/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes bare `&` characters that are not valid HTML entity references.
 * Prevents a crash in the markdown parser caused by a minifier bug (SWC
 * compress.passes:2) that corrupts vfile-message's VMessage constructor
 * in the DLL bundle. When parse-entities encounters an unterminated legacy
 * HTML entity (e.g. `&timestamp=`), it emits a warning via VMessage which
 * throws `ReferenceError: parts is not defined`.
 */
export const escapeUnterminatedEntities = (text: string): string =>
  text.replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);)/g, '&amp;');
