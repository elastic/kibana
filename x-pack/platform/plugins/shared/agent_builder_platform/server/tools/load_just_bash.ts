/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eval import() to prevent TypeScript from transpiling it to require(),
// which breaks just-bash's WASM binary resolution (Python/CPython needs import.meta.url).
// eslint-disable-next-line no-new-func
const dynamicImport = new Function('specifier', 'return import(specifier)');

export const loadBash = async (): Promise<typeof import('just-bash')['Bash']> => {
  const { Bash } = await dynamicImport('just-bash');
  return Bash;
};
