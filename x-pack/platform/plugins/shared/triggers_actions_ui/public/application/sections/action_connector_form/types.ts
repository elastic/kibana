/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserConfiguredActionConnector } from '../../../types';

/**
 * The following type is equivalent to:
 *
 * interface ConnectorFormSchema<Config, Secrets> {
 *  id?: string,
 *  name?: string,
 *  actionTypeId: string,
 *  isDeprecated: boolean,
 *  config: Config,
 *  secrets: Secrets,
 * }
 */

export type ConnectorFormSchema<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
> = Pick<
  UserConfiguredActionConnector<Config, Secrets>,
  'actionTypeId' | 'isDeprecated' | 'config' | 'secrets'
> &
  Partial<Pick<UserConfiguredActionConnector<Config, Secrets>, 'id' | 'name'>>;

export type InternalConnectorForm = ConnectorFormSchema & {
  __internal__?: {
    headers?: Array<{ key: string; value: string; type: string }>;
  };
};
export interface InferenceConnectorProviderConfig {
  [key: string]: unknown;
  max_number_of_allocations?: number;
  adaptive_allocations?: { max_number_of_allocations?: number };
}
