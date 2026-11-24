/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeSecretName } from '@kbn/secrets';
import { getReferencedSecretNames } from '@kbn/workflows-yaml';

/**
 * Returns the distinct secrets that a stored workflow definition references, by their
 * normalized names, so that one secret is found whatever the casing of its references.
 * A workflow without a definition is not valid, cannot run, and so uses no secret.
 */
export const getWorkflowSecretNames = (definition: unknown): string[] => [
  ...new Set(getReferencedSecretNames(definition).map(normalizeSecretName)),
];
