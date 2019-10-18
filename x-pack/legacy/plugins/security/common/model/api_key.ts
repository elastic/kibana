/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ApiKey {
  id: string;
  name: string;
  username: string;
  realm: string;
  creation: number;
  expiration: number;
  invalidated: boolean;
}

export interface ApiKeyToInvalidate {
  id: string;
  name: string;
}
