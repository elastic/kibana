/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Template {
  /*
   * Template identifier, can be shared across multiple SO's as we are storing all the changes made to the template
   */
  templateId: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Yaml definition for the template
   */
  definition: string;

  /**
   * Template version
   */
  templateVersion: number;

  /**
   * Deletion date, used to indicate soft-deletion
   */
  deletedAt: Date | null;
}

export interface ParsedTemplate extends Omit<Template, 'definition'> {
  /**
   * Parsed definition for the template. Needs to be validated programmatically.
   */
  definition: {
    fields: Array<{
      control: string;
      name: string;
      type: 'keyword';
      metadata: Record<string, unknown>;
    }>;
  };
}

export type CreateTemplateInput = Omit<
  Template,
  'id' | 'templateId' | 'templateVersion' | 'deletedAt'
>;

export type UpdateTemplateInput = Omit<
  Template,
  'id' | 'templateId' | 'templateVersion' | 'deletedAt'
>;
