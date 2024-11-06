/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export async function* parseStream(stream: NodeJS.ReadableStream) {
  let partial = '';

  try {
    for await (const value of stream) {
      const full = `${partial}${value}`;
      const parts = full.split('\n');
      const last = parts.pop();

      partial = last ?? '';

      const actions = parts.map((p) => JSON.parse(p));

      for (const action of actions) {
        yield action;
      }
    }
  } catch (error) {
    yield { type: 'error', payload: error.toString() };
  }
}
