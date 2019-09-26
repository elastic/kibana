/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type CodeLine = Token[];

export interface Token {
  value: string;
  scopes: string[];
  range?: Range;
}

export interface Range {
  start: number; // start pos in line
  end: number;
  pos?: number; // position in file
}
