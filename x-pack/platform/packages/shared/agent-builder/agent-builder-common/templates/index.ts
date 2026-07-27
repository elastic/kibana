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

export interface ConversationTemplateField {
  /** ES field name */
  name: string;
  /** ES mapping type for this field */
  type: ConversationTemplateFieldType;
  /** Default value applied to the conversation when the template is used */
  value?: string;
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
