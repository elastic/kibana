/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Clause {
  type: string;
  value: string;
  match: string;
}

export interface Query {
  ast: {
    clauses: Clause[];
  };
  text: string;
  syntax: any;
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;
