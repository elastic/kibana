/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceType } from '../../common/datasource_types';
import type { AuthOption } from '../create_data_source_flyout/auth_options';

export interface DataFedServiceConfig {
  name: DataSourceType;
  enabled: boolean;
  authOptions: (federatedIdentity: boolean) => AuthOption[];
}

export class ServiceRegistry {
  private readonly services = new Map<DataSourceType, DataFedServiceConfig>();

  public register(config: DataFedServiceConfig): void {
    if (this.services.has(config.name)) {
      throw new Error(`Service "${config.name}" is already registered`);
    }
    this.services.set(config.name, config);
  }

  public get(name: DataSourceType): DataFedServiceConfig | undefined {
    return this.services.get(name);
  }

  public has(name: DataSourceType): boolean {
    return this.services.has(name);
  }

  public getAll(): DataFedServiceConfig[] {
    return [...this.services.values()];
  }
}
