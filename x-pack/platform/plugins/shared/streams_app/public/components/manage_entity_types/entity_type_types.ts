/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EntityTypeRow = {
  id: string;
  name: string;
  generatedBy: string;
  category: string;
  entities: number;
  subsets: number;
  managed: boolean;
  /** Display string for the flyout header, e.g. ISO date */
  lastUpdatedDisplay: string;
  dataStream: string;
  entityIdField: string;
  description: string;
};
