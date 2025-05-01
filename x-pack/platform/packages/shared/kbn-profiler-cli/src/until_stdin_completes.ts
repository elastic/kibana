/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export async function untilStdinCompletes() {
  if (process.stdin.isTTY) {
    return undefined;
  }

  await new Promise<string>((resolve) => {
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
    });
    process.stdin.on('end', () => {
      resolve(buffer);
    });
  });
}
