/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { readFile } from 'fs/promises';
import type { EsqlPrompts } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base/load_data';

let cachedPrompts: Promise<EsqlPrompts> | undefined;

export const loadTightPrompts = (): Promise<EsqlPrompts> => {
  if (!cachedPrompts) {
    cachedPrompts = Promise.all([
      readFile(Path.join(__dirname, 'prompts_static', 'syntax.txt'), 'utf-8'),
      readFile(Path.join(__dirname, 'prompts_static', 'examples.txt'), 'utf-8'),
    ]).then(([syntax, examples]) => ({ syntax, examples }));
  }
  return cachedPrompts;
};