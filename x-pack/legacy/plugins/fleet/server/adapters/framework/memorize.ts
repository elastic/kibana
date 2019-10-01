/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { FrameworkAdapter } from './adapter_types';

export class MemorizeFrameworkAdapter implements FrameworkAdapter {
  constructor(private readonly adapter?: FrameworkAdapter) {}

  getSetting(settingPath: string): string {
    return Slapshot.memorize('getSetting', () => {
      if (!this.adapter) {
        throw new Error('an adapter must be provided to run online');
      }
      return this.adapter.getSetting(settingPath);
    }) as string;
  }

  getServerInfo() {
    return {
      protocol: 'http://',
    };
  }
}
