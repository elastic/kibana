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
  template_id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Yaml definition for the template
   */
  definition: string;

  /**
   * Creation date, effectively a version of the template
   */
  created_at: Date;

  /**
   * Deletion date, used to indicate soft-deletion
   */
  deleted_at: Date | null;
}
