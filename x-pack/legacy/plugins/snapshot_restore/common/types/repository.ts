/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type FSRepositoryType = 'fs';
export type ReadonlyRepositoryType = 'url';
export type SourceRepositoryType = 'source';
export type S3RepositoryType = 's3';
export type HDFSRepositoryType = 'hdfs';
export type AzureRepositoryType = 'azure';
export type GCSRepositoryType = 'gcs';

export type RepositoryType =
  | FSRepositoryType
  | ReadonlyRepositoryType
  | SourceRepositoryType
  | S3RepositoryType
  | HDFSRepositoryType
  | AzureRepositoryType
  | GCSRepositoryType;

export interface FSRepository {
  name: string;
  type: FSRepositoryType;
  settings: {
    location: string;
    compress?: boolean;
    chunkSize?: string | null;
    maxRestoreBytesPerSec?: string;
    maxSnapshotBytesPerSec?: string;
    readonly?: boolean;
  };
}

export interface ReadonlyRepository {
  name: string;
  type: ReadonlyRepositoryType;
  settings: {
    url: string;
  };
}

export interface S3Repository {
  name: string;
  type: S3RepositoryType;
  settings: {
    bucket: string;
    client?: string;
    basePath?: string;
    compress?: boolean;
    chunkSize?: string | null;
    serverSideEncryption?: boolean;
    bufferSize?: string;
    cannedAcl?: string;
    storageClass?: string;
    maxRestoreBytesPerSec?: string;
    maxSnapshotBytesPerSec?: string;
    readonly?: boolean;
  };
}

export interface HDFSRepository {
  name: string;
  type: HDFSRepositoryType;
  settings: {
    uri: string;
    path: string;
    loadDefaults?: boolean;
    compress?: boolean;
    chunkSize?: string | null;
    maxRestoreBytesPerSec?: string;
    maxSnapshotBytesPerSec?: string;
    readonly?: boolean;
    ['security.principal']?: string;
    [key: string]: any; // For conf.* settings
  };
}

export interface AzureRepository {
  name: string;
  type: AzureRepositoryType;
  settings: {
    client?: string;
    container?: string;
    basePath?: string;
    locationMode?: string;
    compress?: boolean;
    chunkSize?: string | null;
    maxRestoreBytesPerSec?: string;
    maxSnapshotBytesPerSec?: string;
    readonly?: boolean;
  };
}

export interface GCSRepository {
  name: string;
  type: GCSRepositoryType;
  settings: {
    bucket: string;
    client?: string;
    basePath?: string;
    compress?: boolean;
    chunkSize?: string | null;
    maxRestoreBytesPerSec?: string;
    maxSnapshotBytesPerSec?: string;
    readonly?: boolean;
  };
}

export interface EmptyRepository {
  name: string;
  type: null;
  settings: {
    [key: string]: any;
  };
}

export interface SourceRepository<T> {
  name: string;
  type: SourceRepositoryType;
  settings: SourceRepositorySettings<T>;
}

export type SourceRepositorySettings<T> = T extends FSRepositoryType
  ? FSRepository['settings']
  : T extends S3RepositoryType
  ? S3Repository['settings']
  : T extends HDFSRepositoryType
  ? HDFSRepository['settings']
  : T extends AzureRepositoryType
  ? AzureRepository['settings']
  : T extends GCSRepositoryType
  ? GCSRepository['settings']
  : any & {
      delegateType: T;
    };

export type Repository<T = null> =
  | FSRepository
  | ReadonlyRepository
  | S3Repository
  | HDFSRepository
  | AzureRepository
  | GCSRepository
  | SourceRepository<T>;

export interface ValidRepositoryVerification {
  valid: true;
  response: object;
}

export interface InvalidRepositoryVerification {
  valid: false;
  error: object;
}

export interface ValidRepositoryCleanup {
  cleaned: true;
  response: object;
}

export interface InvalidRepositoryCleanup {
  cleaned: false;
  error: object;
}

export type RepositoryVerification = ValidRepositoryVerification | InvalidRepositoryVerification;

export type RepositoryCleanup = ValidRepositoryCleanup | InvalidRepositoryCleanup;
