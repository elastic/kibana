/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../graphql/types';
import { InfraWrappableRequest } from '../../server/lib/adapters/framework';

export interface InfraMetadataRequest {
  nodeId: string;
  nodeType: InfraNodeType;
  sourceId: string;
}
export type InfraMetadataWrappedRequest = InfraWrappableRequest<InfraMetadataRequest>;

export interface InfraMetadata {
  name: string;
  features: InfraMetadataFeature[];
  info?: InfraMetadataInfo | null;
}

export interface InfraMetadataFeature {
  name: string;
  source: string;
}

export interface InfraMetadataInfo {
  cloud?: InfraMetadataCloud | null;
  host?: InfraMetadataHost | null;
}

export interface InfraMetadataCloud {
  instance?: InfraMetadataInstance | null;
  provider?: string | null;
  availability_zone?: string | null;
  project?: InfraMetadataProject | null;
  machine?: InfraMetadataMachine | null;
}

export interface InfraMetadataInstance {
  id?: string | null;
  name?: string | null;
}

export interface InfraMetadataProject {
  id?: string | null;
}

export interface InfraMetadataMachine {
  interface?: string | null;
}

export interface InfraMetadataHost {
  name?: string | null;
  os?: InfraMetadataOS | null;
  architecture?: string | null;
  containerized?: boolean | null;
}

export interface InfraMetadataOS {
  codename?: string | null;
  family?: string | null;
  kernel?: string | null;
  name?: string | null;
  platform?: string | null;
  version?: string | null;
}
