/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'tar-fs' {
  interface PackOptions {
    map?: (header: { name: string; type: string }) => { name: string; type: string };
    filter?: (name: string) => boolean;
  }

  function pack(
    cwd: string,
    opts?: PackOptions
  ): NodeJS.ReadableStream & {
    on(event: 'entry', cb: (header: { type: string }) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
  };
}
