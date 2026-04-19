/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Supported SML rule types. Currently only 'index' is supported;
 * add new types here as the feature evolves.
 */
export type SmlRuleType = 'index';

/**
 * Built-in index metadata endpoints that can be used as variable inputs
 * for rules of type 'index'. Add new endpoints here as needed.
 */
export type IndexVariableInput = '_mapping' | '_settings' | '_field_caps';

/**
 * A variable that fetches built-in Elasticsearch index metadata.
 */
export interface IndexVariable {
  type: 'index';
  input: IndexVariableInput;
  params?: Record<string, string>;
}

/**
 * A variable that executes a user-defined ES|QL query.
 */
export interface EsqlVariable {
  type: 'esql';
  input: string;
  params?: Record<string, string>;
}

/**
 * Discriminated union of all supported variable types.
 * To add a new variable type, define a new interface and add it to this union.
 */
export type SmlRuleVariable = IndexVariable | EsqlVariable;

/**
 * An SML rule as stored and returned by the API.
 */
export interface SmlRule {
  id: string;
  name: string;
  type: SmlRuleType;
  index_pattern: string;
  inference_id: string;
  prompt: string;
  variables: Record<string, SmlRuleVariable>;
  created_at: string;
  updated_at: string;
}
