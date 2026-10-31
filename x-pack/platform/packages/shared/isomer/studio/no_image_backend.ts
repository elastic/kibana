/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerHooks } from 'node:module';

const imageBackend =
  /(?:^|[/\\])(?:@elastic[/\\]isomer-image[^/\\]*|@takumi-rs|takumi|pdfkit)(?:[/\\]|$)/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (imageBackend.test(specifier)) {
      throw new Error(`Isomer Studio does not allow image backends: ${specifier}`);
    }
    const resolved = nextResolve(specifier, context);
    if (imageBackend.test(resolved.url)) {
      throw new Error(`Isomer Studio does not allow image backends: ${resolved.url}`);
    }
    return resolved;
  },
});
