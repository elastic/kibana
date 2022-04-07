/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = Record<string, Json>;

export interface EsMapping {
  name: string;
  type: string;
  isArray: boolean;
  description: string;
  esParameters: Record<string, Json>;
  properties: Record<string, EsMapping> | undefined;
}
