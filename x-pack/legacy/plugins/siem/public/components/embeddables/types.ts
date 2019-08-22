/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ImportSavedObjectError {
  id: string;
  type: string;
  title: string;
  error: {
    type: string;
  };
}

export interface ImportSavedObjectResponse {
  success: boolean;
  successCount: number;
  errors: ImportSavedObjectError[];
}
