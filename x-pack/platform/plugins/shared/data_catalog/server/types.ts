/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataCatalog } from './data_catalog';
import type { DataSource } from '../common/data_source_spec';

export interface DataCatalogPluginSetup {
  register: (dataType: DataSource) => void;
}

export interface DataCatalogPluginStart {
  getCatalog: () => DataCatalog;
}
