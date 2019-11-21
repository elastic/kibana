/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IndexPatternSavedObject {
  attributes: {
    title: string;
  };
  id: string;
  type: string;
  updated_at: string;
  version: string;
}

export interface IndexPatternResponse {
  page: number;
  per_page: number;
  saved_objects: IndexPatternSavedObject[];
  total: number;
}
