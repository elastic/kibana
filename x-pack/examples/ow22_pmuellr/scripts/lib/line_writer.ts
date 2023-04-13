/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INDENT_LENGTH = 2;
const INDENT = ''.padStart(INDENT_LENGTH);

export function createLineWriter() {
  return new LineWriterImpl();
}

export interface LineWriter {
  addLine(line: string): void;
  indent(): void;
  dedent(): void;
  getContent(): string;
}

class LineWriterImpl implements LineWriter {
  private indent_: string;
  private lines_: string[];

  constructor() {
    this.indent_ = '';
    this.lines_ = [];
  }

  addLine(line: string) {
    this.lines_.push(`${this.indent_}${line}`);
  }

  indent() {
    this.indent_ = `${this.indent_}${INDENT}`;
  }

  dedent() {
    this.indent_ = this.indent_.substr(INDENT_LENGTH);
  }

  getContent() {
    return this.lines_.join('\n');
  }
}
