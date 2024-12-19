/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { createUseFieldsMetadataHook } from './hooks/use_fields_metadata';
import { FieldsMetadataService } from './services/fields_metadata';
import { FieldsMetadataClientPluginClass } from './types';

export class FieldsMetadataPlugin implements FieldsMetadataClientPluginClass {
  private fieldsMetadata: FieldsMetadataService;

  constructor() {
    this.fieldsMetadata = new FieldsMetadataService();
  }

  public setup() {
    this.fieldsMetadata.setup();

    return {};
  }

  public start(core: CoreStart) {
    const { http } = core;

    const fieldsMetadataService = this.fieldsMetadata.start({ http });

    const useFieldsMetadata = createUseFieldsMetadataHook({ fieldsMetadataService });

    return {
      getClient: fieldsMetadataService.getClient,
      useFieldsMetadata,
    };
  }
}
