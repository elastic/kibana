/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyConfigRecordEntry } from '../..';
export interface Secret {
  id: string;
}

export interface SecretElasticDoc {
  value: string;
}
// this replaces a var value with a reference to a secret
export type VarSecretReference = {
  isSecretRef: true;
} & ({ id: string } | { ids: string[] });

export interface SecretPath {
  path: string[];
  value: PackagePolicyConfigRecordEntry;
}
export interface SOSecretPath {
  path: string;
  value: string | { id: string };
}

export type SOSecret =
  | string
  | {
      id: string;
      hash?: string;
    };

// this is used in the top level secret_refs array on package and agent policies
export interface PolicySecretReference {
  id: string;
}

export interface DeletedSecretResponse {
  deleted: boolean;
}
export interface DeletedSecretReference {
  id: string;
  deleted: boolean;
}

export interface BaseSSLSecrets {
  ssl?: { key?: SOSecret };
}
