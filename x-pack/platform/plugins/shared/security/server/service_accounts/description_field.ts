/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `description` field to spread into an account or a request. It is present only for a
 * non-empty string, so a missing, empty or non-string description is left out either way.
 */
export const toDescriptionField = (
  description: string | null | undefined
): { description?: string } =>
  typeof description === 'string' && description !== '' ? { description } : {};
