/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Casts a document (from ingest/ES|QL results) to Record<string, unknown> for property access.
 * Needed because upstream IModel/object types don't expose index signatures.
 */
export const asDoc = (doc: unknown): Record<string, unknown> => doc as Record<string, unknown>;
