/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import FormData from 'form-data';

/**
 * Helper to prepare FormData for saved objects import
 * Returns buffer and headers ready to use with apiClient
 */
export const prepareImportFormData = (objects: Array<Record<string, any>>) => {
  const ndjsonContent = objects.map((obj) => JSON.stringify(obj)).join('\n');
  const formData = new FormData();
  formData.append('file', ndjsonContent, 'import.ndjson');

  return {
    buffer: formData.getBuffer(),
    headers: formData.getHeaders(),
  };
};
