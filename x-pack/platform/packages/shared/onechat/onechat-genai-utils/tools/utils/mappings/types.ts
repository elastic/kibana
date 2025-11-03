/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the relevant information of an field
 */
export interface MappingField {
  /** the path of the field */
  path: string;
  /** the type of the field */
  type: string;
  /** meta attached to the field */
  meta: Record<string, string>;
}
