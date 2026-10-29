/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateImportData,
  ImportKind,
  ImportResponse,
  UpdateImportData,
} from '@kbn/alerting-v2-schemas';

/** The user-set fields every import has, whatever its kind. */
export type ImportConfigFields = Pick<CreateImportData, 'description' | 'tags' | 'routing_tags'> &
  Pick<CreateImportData, 'default_severity' | 'owner' | 'external_config_url'> &
  Pick<CreateImportData, 'fingerprint_field'> & { name: string };

/** Everything the saved object needs that the user does not type in. */
export interface CreateImportConfigParams {
  data: ImportConfigFields;
  kind?: ImportKind;
  /** Set for managed imports. */
  connectorTypeId?: string;
  /** Chosen up front so the generated workflow can carry it. */
  id: string;
  source: string;
  connectorId: string;
  workflowId: string;
}

export interface FindImportConfigsArgs {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface FindImportConfigsResponse {
  items: ImportResponse[];
  total: number;
  page: number;
  perPage: number;
}

export interface UpdateImportConfigParams {
  id: string;
  data: UpdateImportData;
}
