/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ISearchGeneric } from '@kbn/search-types';

/**
 * Services required to render custom content. Passed explicitly by consumers so the package stays
 * decoupled from any single plugin's Kibana context shape: the dashboard embeddable and the agent
 * builder chat both render the same component from different hosts.
 */
export interface CustomContentRendererServices {
  http: HttpStart;
  uiSettings: IUiSettingsClient;
  search: ISearchGeneric;
}
