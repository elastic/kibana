/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToStringOptions } from 'yaml';
import { Document, visit } from 'yaml';

/**
 * Converts a plain object to a YAML string, forcing multi-line strings to use
 * literal block scalars (`source: |`). Without this, the yaml package may choose
 * folded block scalars (`source: >`) for long lines, which Elasticsearch's
 * Jackson YAML parser rejects.
 */
export function toYaml(obj: unknown, opts?: ToStringOptions): string {
  const doc = new Document(obj);
  visit(doc, {
    Scalar(key, node) {
      if (typeof node.value === 'string' && node.value.includes('\n')) {
        node.type = 'BLOCK_LITERAL';
      }
    },
  });
  return doc.toString(opts);
}
