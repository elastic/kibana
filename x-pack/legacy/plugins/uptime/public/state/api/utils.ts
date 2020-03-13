/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchQuery, HttpSetup } from '../../../../../../../target/types/core/public';

class ApiService {
  private static instance: ApiService;
  private _http!: HttpSetup;

  public get http() {
    return this._http;
  }

  public set http(httpSetup: HttpSetup) {
    this._http = httpSetup;
  }

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }

    return ApiService.instance;
  }

  public async get(apiUrl: string, params: HttpFetchQuery) {
    const response = await this._http!.get(apiUrl, { query: params });
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }

  public async post(apiUrl: string, data: any) {
    const response = await this._http!.post(apiUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }

  public async delete(apiUrl: string) {
    const response = await this._http!.delete(apiUrl);
    if (response instanceof Error) {
      throw response;
    }
    return response;
  }
}

export const apiService = ApiService.getInstance();
