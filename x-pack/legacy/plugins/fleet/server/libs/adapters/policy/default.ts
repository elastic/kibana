/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestPlugin, PolicyAdapter as PolicyAdapterType } from './adapter_type';

export class PolicyAdapter implements PolicyAdapterType {
  constructor(private readonly plugin: IngestPlugin) {}

  /**
   * Return a full policy
   *
   * @param id
   */
  async getFullPolicy(id: string) {
    return await this.plugin.getFull(id);
  }
}
