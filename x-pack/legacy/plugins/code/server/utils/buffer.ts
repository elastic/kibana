/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const LF = '\n'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);

export function extractLines(buf: Buffer, fromLine: number, toLine: number) {
  let currentLine = 0;
  let fromIdx = 0;
  let toIdx = buf.length;
  let lastChar = -1;
  for (const [idx, char] of buf.entries()) {
    if (char === LF) {
      currentLine++;
      if (currentLine === fromLine) {
        fromIdx = idx + 1;
      }
      if (currentLine === toLine) {
        // line-break is CRLF under windows
        if (lastChar === CR) {
          toIdx = idx - 1;
        } else {
          toIdx = idx;
        }
        break;
      }
    }
    lastChar = char;
  }
  return buf.toString('utf8', fromIdx, toIdx);
}
