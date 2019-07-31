/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Metadata {
  name: string;
  features: MetadataFeatures[];
  info?: MetadataInfo | null;
}

export interface MetadataFeatures {
  name: string;
  source: string;
}

export interface MetadataInfo {
  cloud?: MetadataCloud | null;
  host?: MetadataHost | null;
}

export interface MetadataCloud {
  instance?: MetadataInstance | null;
  provider?: string | null;
  availability_zone?: string | null;
  project?: MetadataProject | null;
  machine?: MetadataMachine | null;
}

export interface MetadataInstance {
  id?: string | null;
  name?: string | null;
}

export interface MetadataProject {
  id?: string | null;
}

export interface MetadataMachine {
  interface?: string | null;
}

export interface MetadataHost {
  name?: string | null;
  os?: MetadataOs | null;
  architecture?: string | null;
  containerized?: boolean | null;
}

export interface MetadataOs {
  codename?: string | null;
  family?: string | null;
  kernel?: string | null;
  name?: string | null;
  platform?: string | null;
  version?: string | null;
}
