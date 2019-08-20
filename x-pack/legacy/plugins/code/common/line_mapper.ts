/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { SourceLocation } from '../model';

export class LineMapper {
  private lines: string[];
  private acc: number[];

  constructor(content: string) {
    this.lines = content.split('\n');
    this.acc = [0];
    this.getLocation = this.getLocation.bind(this);

    for (let i = 0; i < this.lines.length - 1; i++) {
      this.acc[i + 1] = this.acc[i] + this.lines[i].length + 1;
    }
  }

  public getLocation(offset: number): SourceLocation {
    let line = _.sortedIndex(this.acc, offset);
    if (offset !== this.acc[line]) {
      line -= 1;
    }
    const column = offset - this.acc[line];
    return { line, column, offset };
  }

  public getLines(): string[] {
    return this.lines;
  }
}
