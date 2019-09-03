/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Repo {
  url: string;
  path: string;
  language: string;
}

export interface TestConfig {
  repos: Repo[];
}

export enum RequestType {
  INITIALIZE,
  HOVER,
  FULL,
}
