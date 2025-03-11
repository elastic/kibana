/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchConnectorsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new SearchConnectorsPlugin();
}

export type { SearchConnectorsPluginSetup, SearchConnectorsPluginStart } from './types';

export type {
  CreateHrefOptions,
  ReactRouterProps,
  GeneratedReactRouterProps,
} from './components/shared/react_router_helpers';
export {
  letBrowserHandleEvent,
  createHref,
  generateReactRouterProps,
  EuiLinkTo,
  EuiButtonTo,
  EuiButtonEmptyTo,
  EuiButtonIconTo,
  EuiListGroupItemTo,
  EuiPanelTo,
  EuiCardTo,
  EuiBadgeTo,
} from './components/shared/react_router_helpers';

export {
  ConnectorSyncRules,
  ConnectorScheduling,
  ConvertConnectorLogic,
  ConnectorNameAndDescriptionFlyout,
  ConnectorOverviewPanels,
} from './components/search_index/connector';

export {
  SyncJobs,
  SearchIndexDocuments,
  IndexViewLogic,
  IndexNameLogic,
  SearchIndexIndexMappings,
} from './components/search_index';
export {
  ConnectorConfiguration,
  ConnectorNameAndDescriptionLogic,
} from './components/connector_detail';

export { mappingsWithPropsApiLogic } from './api';
