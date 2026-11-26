/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';

export type SecretsRouteDependencies = Pick<RouteDependencies, 'router'> &
  Required<Pick<RouteDependencies, 'getSecretsClient'>>;

export const SECRETS_PATH = '/internal/workflows/secrets';
export const SECRET_PATH = `${SECRETS_PATH}/{name}`;
