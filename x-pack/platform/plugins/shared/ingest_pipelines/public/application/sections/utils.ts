/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Error } from '../../shared_imports';

export const getErrorText = (error: Error) => {
  return error.message && error.message !== '{}' ? error.message : error.error;
};

// All pipleines for integrations end in @custom
export const isIntegrationsPipeline = (name: string) => {
  return name.toLowerCase().endsWith('@custom');
};
