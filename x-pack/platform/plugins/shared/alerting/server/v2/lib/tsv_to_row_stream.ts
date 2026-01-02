/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'node:stream';

export function tsvToRowStream<T>() {
  let headers: string[];
  let leftover = '';

  function processLine(line: string) {
    const values = line.split('\t');

    if (!headers) {
      headers = values;
      return;
    }

    // TODO: Convert types
    const row = Object.create(null);
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i];
    }

    return row;
  }

  return new Transform({
    readableObjectMode: true,
    transform(chunk, _enc, cb) {
      const data = leftover + chunk.toString();

      const lines = data.split('\n');

      leftover = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const row = processLine(line);
        if (row) {
          this.push(row);
        }
      }

      cb();
    },
    flush(cb) {
      if (leftover.trim()) {
        const row = processLine(leftover);
        if (row) {
          this.push(row);
        }
      }
      cb();
    },
  });
}
