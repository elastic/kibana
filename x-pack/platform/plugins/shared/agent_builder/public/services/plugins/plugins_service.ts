/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  ListPluginsResponse,
  GetPluginResponse,
  DeletePluginResponse,
} from '../../../common/http_api/plugins';
import { publicApiPath } from '../../../common/constants';

export class PluginsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list() {
    const { results } = await this.http.get<ListPluginsResponse>(`${publicApiPath}/plugins`, {});
    return results;
  }

  async get({ pluginId }: { pluginId: string }) {
    return await this.http.get<GetPluginResponse>(`${publicApiPath}/plugins/${pluginId}`, {});
  }

  async delete({ pluginId }: { pluginId: string }) {
    return await this.http.delete<DeletePluginResponse>(`${publicApiPath}/plugins/${pluginId}`, {});
  }
}
