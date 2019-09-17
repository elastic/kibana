/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformId, TRANSFORM_STATE } from '../../../../common';

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

export interface TransformEndpointRequest {
  id: TransformId;
  state?: TRANSFORM_STATE;
}

export interface ResultData {
  success: boolean;
  error?: any;
}

export interface TransformEndpointResult {
  [key: string]: ResultData;
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;
