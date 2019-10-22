/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash';

export interface Format {
  [field: string]: string | Format;
}

export interface Field {
  name: string;
  path: string;
  format: string;
}

const BOUNDARY = 'ª––––––––º';

const SPLITTER = '≤∞≥';

export class FormatParser {
  private fields: Field[];

  constructor(public readonly format: Format) {
    this.fields = [];
    this.toFields(this.fields, format);
  }

  private toFields(fields: Field[], format: Format, prefix: string = '') {
    Object.entries(format).forEach(entry => {
      const [key, value] = entry;
      if (typeof value === 'string') {
        fields.push({
          name: key,
          path: `${prefix}${key}`,
          format: value,
        });
      } else {
        this.toFields(fields, value, `${prefix}${key}.`);
      }
    });
  }

  public toFormatStr(): string {
    return this.fields.map(f => f.format).join(SPLITTER) + BOUNDARY;
  }

  public parseResult(result: string): any[] {
    return result
      .split(BOUNDARY)
      .map(item => item.trim().split(SPLITTER))
      .filter(items => items.length > 0)
      .map(items => this.toObject(items));
  }

  private toObject(items: string[]) {
    const result = {};
    this.fields.forEach((f, i) => {
      set(result, f.path, items[i]);
    });
    return result;
  }
}
