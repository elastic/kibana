/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LogMessageFormattingRule {
  when: LogMessageFormattingCondition;
  format: LogMessageFormattingInstruction[];
}

export type LogMessageFormattingCondition =
  | LogMessageFormattingExistsCondition
  | LogMessageFormattingFieldValueCondition;

export interface LogMessageFormattingExistsCondition {
  exists: string[];
}

export interface LogMessageFormattingFieldValueCondition {
  values: {
    [fieldName: string]: string | number | boolean | null;
  };
}

export type LogMessageFormattingInstruction =
  | LogMessageFormattingFieldReference
  | LogMessageFormattingConstant;

export interface LogMessageFormattingFieldReference {
  field: string;
}

export interface LogMessageFormattingConstant {
  constant: string;
}
