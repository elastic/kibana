/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmExplainLifecycleLifecycleExplain,
  HealthStatus,
  IndicesStatsIndexMetadataState,
  Uuid,
} from '@elastic/elasticsearch/lib/api/types';
import type { ScopedHistory } from '@kbn/core-application-browser';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ExtensionsSetup } from './services/extensions_service';
import type { PublicApiServiceSetup } from './services/public_api_service';

export type IndexManagementLocatorParams = SerializableRecord &
  (
    | {
        page: 'index_list';
        filter?: string;
        includeHiddenIndices?: boolean;
      }
    | {
        page: 'data_stream_index_list';
        dataStreamName: string;
      }
    | {
        page: 'data_streams_details';
        dataStreamName?: string;
      }
    | {
        page: 'index_template';
        indexTemplate: string;
      }
    | {
        page: 'index_template_edit';
        indexTemplate: string;
      }
    | {
        page: 'index_template_clone';
        indexTemplate: string;
      }
    | {
        page: 'create_template';
      }
    | {
        page: 'component_template';
        componentTemplate: string;
      }
    | {
        page: 'component_template_list';
        filter?: string;
      }
    | {
        page: 'edit_component_template';
        componentTemplate: string;
      }
    | {
        page: 'clone_component_template';
        componentTemplate: string;
      }
    | {
        page: 'create_component_template';
        componentTemplate: string;
      }
  );

export type IndexManagementLocator = LocatorPublic<IndexManagementLocatorParams>;

export type IndexManagementAppMountParams = Pick<
  ManagementAppMountParams,
  'setBreadcrumbs' | 'history'
> & { element: HTMLElement | null };

export interface IndexManagementPluginSetup {
  apiService: PublicApiServiceSetup;
  extensionsService: ExtensionsSetup;
  renderIndexManagementApp: (params: IndexManagementAppMountParams) => Promise<() => void>;
  locator?: IndexManagementLocator;
}

export interface IndexManagementPluginStart {
  apiService: PublicApiServiceSetup;
  extensionsService: ExtensionsSetup;
  getIndexMappingComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<IndexMappingProps>;
  getIndexSettingsComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<IndexSettingProps>;
  getComponentTemplateFlyoutComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<ComponentTemplateFlyoutProps>;
  getIndexTemplateFlyoutComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<IndexTemplateFlyoutProps>;
  getDatastreamFlyoutComponent: (deps: {
    history: ScopedHistory<unknown>;
  }) => React.FC<DatastreamFlyoutProps>;
}

export interface Index {
  name: string;
  primary?: number | string;
  replica?: number | string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;
  mode?: string;

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

export interface ComponentTemplateFlyoutProps {
  componentTemplateName: string;
  onClose: () => void;
}

export interface IndexTemplateFlyoutProps {
  indexTemplateName: string;
  onClose: () => void;
  reload: () => void;
}

export interface DatastreamFlyoutProps {
  datastreamName: string;
  onClose: () => void;
}

export interface IndexMappingProps {
  index?: Index;
  showAboutMappings?: boolean;
}
export interface IndexSettingProps {
  indexName: string;
  hasUpdateSettingsPrivilege?: boolean;
}
export interface SendRequestResponse<D = any, E = any> {
  data: D | null;
  error: E | null;
}
