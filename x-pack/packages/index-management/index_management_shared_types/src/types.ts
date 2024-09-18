/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IlmExplainLifecycleLifecycleExplain,
  HealthStatus,
  IndicesStatsIndexMetadataState,
  Uuid,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ScopedHistory } from '@kbn/core-application-browser';
import { ExtensionsSetup } from './services/extensions_service';
import { PublicApiServiceSetup } from './services/public_api_service';

export interface IndexManagementPluginSetup {
  apiService: PublicApiServiceSetup;
  extensionsService: ExtensionsSetup;
}

export interface IndexManagementPluginStart {
  extensionsService: ExtensionsSetup;
  getIndexMappingComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<IndexMappingProps>;
}

export interface Index {
  name: string;
  primary?: number | string;
  replica?: number | string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;

  // The types below are added by extension services if corresponding plugins are enabled (ILM, Rollup, CCR)
  isRollupIndex?: boolean;
  ilm?: IlmExplainLifecycleLifecycleExplain;
  isFollowerIndex?: boolean;

  // The types from here below represent information returned from the index stats API;
  // treated optional as the stats API is not available on serverless
  health?: HealthStatus;
  status?: IndicesStatsIndexMetadataState;
  uuid?: Uuid;
  documents?: number;
  size?: string;
  primary_size?: string;
  documents_deleted?: number;
}

export interface IndexMappingProps {
  index?: Index;
  showAboutMappings?: boolean;
}

export interface SendRequestResponse<D = any, E = any> {
  data: D | null;
  error: E | null;
}
