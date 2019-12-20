/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from '../../../../../../src/core/server';
import { ESDatabaseAdapter } from './adapters/es_database/default';
import { DatasourcesLib } from './datasources';
import { BackendFrameworkLib } from './framework';
import { OutputsLib } from './outputs';
import { PolicyLib } from './policy';

export interface ServerLibs {
  outputs: OutputsLib;
  datasources: DatasourcesLib;
  policy: PolicyLib;
  framework: BackendFrameworkLib;
  database?: ESDatabaseAdapter;
}

/**
 * The entire config for the Beats agent, including all assigned data source config outputs
 * along with agent-wide configuration values
 */
export interface Policy {
  datasources?: Datasource[];
  description?: string;
  id: string;
  name: string;
  status: Status;
  label?: string; // the key formerly known as "use case"
  updated_on: string;
  updated_by: string;
}

/**
 * A logical grouping of places where data is coming from, such as "Production", "Staging",
 * "Production East-1", "Metrics Cluster", etc. -- these groupings are user-defined. We
 * store information collected from the user about this logical grouping such as a name and
 * any other information we need about it to generate the associated config. A package
 * defines its own data source templates that can use user-provided values to generate the
 * data source config. A single data source will typically enable users to collect both logs
 * and metrics. A data source can be in multiple policies at the same time. A datasource can
 * have multiple streams.
 */
export interface Datasource extends SavedObjectAttributes {
  id: string;
  name: string;
  package: Package;
  read_alias?: string;
  streams: Stream[];
}

/**
 * A group of items related to a data ingestion source (e.g. MySQL, nginx, AWS). Can include
 * Kibana assets, ES assets, data source configuration templates, manual install steps, etc.
 */
export interface Package extends SavedObjectAttributes {
  assets: Asset[];
  description?: string;
  name: string;
  title?: string;
  version: string;
}

/**
 * Item installed for Kibana (e.g. dashboard, visualization), Elasticsearch (e.g. ingest
 * pipeline, ILM policy), or a Kibana plugin (e.g. ML job)
 */
export interface Asset extends SavedObjectAttributes {
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
export interface Stream extends SavedObjectAttributes {
  config?: { [key: string]: any };
  id: string;
  input: Input;
  output_id: string;
  processors?: string[];
}

/**
 * Where the data comes from
 */
export interface Input extends SavedObjectAttributes {
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
  username?: string;
  password?: string;
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
}

export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}
