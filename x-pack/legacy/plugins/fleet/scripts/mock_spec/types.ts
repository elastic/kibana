/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Has config from zero or more datasources.
 */
export interface Policy {
  datasources?: Datasource[];
  description?: string;
  id: string;
  name?: string;
  status: Status;
}

/**
 * A package with a use case (eg prod_west). The use case ID must be unique. A datasource
 * can have multiple streams.
 */
export interface Datasource {
  id?: string;
  /**
   * Should be unique
   */
  name: string;
  package: Package;
  read_alias?: string;
  streams: Stream[];
}

/**
 * Multiple dashboard templates and multiple input templates, eg access log, error log,
 * metrics, consisting of index template, ingest pipeline, ML jobs.
 */
export interface Package {
  assets: Asset[];
  description?: string;
  name: string;
  title?: string;
  version: string;
}

export interface Asset {
  id: string;
  type: AssetType;
}

/**
 * Types of assets which can be installed/removed
 */
export enum AssetType {
  DataFrameTransform = 'data-frame-transform',
  IlmPolicy = 'ilm-policy',
  IndexTemplate = 'index-template',
  IngestPipeline = 'ingest-pipeline',
  MlJob = 'ml-job',
  RollupJob = 'rollup-job',
}

/**
 * A combination of an input type, the required config, an output, and any processors
 */
export interface Stream {
  config?: { [key: string]: any };
  id: string;
  input: Input;
  output: Output;
  processors?: string[];
}

/**
 * Where the data comes from
 */
export interface Input {
  /**
   * Mix of configurable and required properties still TBD. Object for now might become string
   */
  config: { [key: string]: any };
  fields?: Array<{ [key: string]: any }>;
  id?: string;
  ilm_policy?: string;
  index_template?: string;
  /**
   * Need a distinction for "main" ingest pipeline. Should be handled during install. Likely
   * by package/manifest format
   */
  ingest_pipelines?: string[];
  type: InputType;
}

export enum InputType {
  Etc = 'etc',
  Log = 'log',
  MetricDocker = 'metric/docker',
  MetricSystem = 'metric/system',
}

/**
 * Where to send the data
 */
export interface Output {
  api_token?: string;
  /**
   * contains everything not otherwise specified (e.g. TLS, etc)
   */
  config?: { [key: string]: any };
  id: string;
  /**
   * unique alias with write index
   */
  index_name?: string;
  ingest_pipeline?: string;
  name: string;
  type: OutputType;
  url?: string;
}

export enum OutputType {
  Elasticsearch = 'elasticsearch',
  Else = 'else',
  Something = 'something',
}

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}
