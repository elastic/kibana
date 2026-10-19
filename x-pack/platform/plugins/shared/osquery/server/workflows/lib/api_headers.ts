/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../../common/constants';

export const PUBLIC_API_HEADERS = { 'elastic-api-version': API_VERSIONS.public.v1 };
export const INTERNAL_API_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };
