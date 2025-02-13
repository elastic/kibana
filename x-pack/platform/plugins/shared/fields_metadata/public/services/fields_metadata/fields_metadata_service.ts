/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldsMetadataServiceStartDeps,
  FieldsMetadataServiceSetup,
  FieldsMetadataServiceStart,
  IFieldsMetadataClient,
} from './types';

export class FieldsMetadataService {
  private client?: IFieldsMetadataClient;

  public setup(): FieldsMetadataServiceSetup {
    return {};
  }

  public start({ http }: FieldsMetadataServiceStartDeps): FieldsMetadataServiceStart {
    return {
      getClient: () => this.getClient({ http }),
    };
  }

  private async getClient({ http }: FieldsMetadataServiceStartDeps) {
    if (!this.client) {
      const { FieldsMetadataClient } = await import('./fields_metadata_client');
      const client = new FieldsMetadataClient(http);
      this.client = client;
    }

    return this.client;
  }
}
