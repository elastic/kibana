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

export { ConvertConnectorModal } from './components/shared/convert_connector_modal/convert_connector_modal';
export { SyncsContextMenu } from './components/shared/header_actions/syncs_context_menu';

export {
  ConnectorSyncRules,
  ConnectorScheduling,
  ConvertConnectorLogic,
  ConnectorNameAndDescriptionFlyout,
  ConnectorOverviewPanels,
} from './components/search_index/connector';

export { DefaultSettingsFlyout } from './components/settings/default_settings_flyout';
export { ingestionStatusToColor, ingestionStatusToText } from './utils/ingestion_status_helpers';

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

export type {
  CancelSyncsActions,
  DeleteIndexApiLogicArgs,
  DeleteIndexApiLogicValues,
  FetchIndexActions,
  FetchIndexApiResponse,
} from './api';
export {
  mappingsWithPropsApiLogic,
  CancelSyncsApiLogic,
  DeleteIndexApiLogic,
  FetchIndexApiLogic,
} from './api';
