/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ConversationTemplateFieldType =
  | 'keyword'
  | 'text'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date';

export interface ConversationTemplateFieldValidation {
  /** Field must have a non-empty value when the template is applied. */
  required?: boolean;
  /** Regex the value must match, with an optional custom error message. */
  pattern?: { regex: string; message?: string };
  /** Minimum string length — applies to `keyword` and `text` fields. */
  min_length?: number;
  /** Maximum string length — applies to `keyword` and `text` fields. */
  max_length?: number;
  /** Minimum numeric value — applies to `integer` and `float` fields. */
  min?: number;
  /** Maximum numeric value — applies to `integer` and `float` fields. */
  max?: number;
  /** Exhaustive list of accepted values. */
  allowed_values?: string[];
}

export interface ConversationTemplateField {
  /** ES field name */
  name: string;
  /** ES mapping type for this field */
  type: ConversationTemplateFieldType;
  /** Default value applied to the conversation when the template is used */
  value?: string;
  /** Optional validation rules checked whenever the template is applied. */
  validation?: ConversationTemplateFieldValidation;
}

export interface ConversationTemplateDefinition {
  fields?: ConversationTemplateField[];
}

export interface ConversationTemplate {
  id: string;
  name: string;
  description?: string;
  definition: ConversationTemplateDefinition;
}
