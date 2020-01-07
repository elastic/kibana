/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from './adapters/framework/adapter_types';
import { BackendFrameworkLib } from './framework';
import { Output, OutputType } from '../../common/types/domain_data';

export class OutputsLib {
  constructor(
    private readonly libs: {
      framework: BackendFrameworkLib;
    }
  ) {}
  public async getByIDs(_user: FrameworkUser, ids: string[]): Promise<Output[]> {
    if (ids.length > 0 && ids[0] !== 'default') {
      throw new Error('Currently, only a default output is supported');
    }

    return [
      {
        id: 'default',
        name: 'default',
        type: OutputType.Elasticsearch,
        url: this.libs.framework.getSetting('defaultOutputHost'),
        ingest_pipeline: 'default',
      },
    ];
  }
}
