/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from './adapters/framework/adapter_types';
import { Output, OutputType } from './adapters/policy/adapter_types';

export class OutputsLib {
  public async getByIDs(_user: FrameworkUser, _ids: string[]): Promise<Output[]> {
    return new Promise(resolve => {
      resolve([
        {
          id: 'default',
          name: 'default',
          type: OutputType.Elasticsearch,
          url: '<Kibana URL>',
          ingest_pipeline: 'default',
        },
      ]);
    });
  }
}
