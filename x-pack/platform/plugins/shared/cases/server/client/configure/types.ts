/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseConnector, ConnectorSyncSettings } from '../../../common/types/domain';
import type { IndexRefresh } from '../../services/types';

export interface MappingsArgs {
  connector: CaseConnector;
}

export interface CreateMappingsArgs extends MappingsArgs, IndexRefresh {
  owner: string;
  sync?: ConnectorSyncSettings;
}

export interface UpdateMappingsArgs extends MappingsArgs, IndexRefresh {
  mappingId: string;
  /** Written alongside the regenerated mappings; omitted keys keep their saved value. */
  sync?: ConnectorSyncSettings;
}
