/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import he from 'he';

// escape html characters
export function mlEscape(str: string): string {
  // It's not possible to use "he" encoding directly
  // because \ and / characters are not going to be replaced without
  // encodeEverything option. But with this option enabled
  // each word character is encoded as well.
  return String(str).replace(/\W/g, (s) =>
    he.encode(s, {
      useNamedReferences: true,
      encodeEverything: true,
      allowUnsafeSymbols: false,
    })
  );
}
