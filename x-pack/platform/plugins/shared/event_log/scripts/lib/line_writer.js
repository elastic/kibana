/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INDENT_LENGTH = 2;
const INDENT = ''.padStart(INDENT_LENGTH);

module.exports = {
  createLineWriter,
};

class LineWriter {
  constructor() {
    this._indent = '';
    this._lines = [];
  }

  addLine(line) {
    this._lines.push(`${this._indent}${line}`);
  }

  indent() {
    this._indent = `${this._indent}${INDENT}`;
  }

  dedent() {
    this._indent = this._indent.substr(INDENT_LENGTH);
  }

  getContent() {
    return this._lines.join('\n');
  }
}

function createLineWriter() {
  return new LineWriter();
}
