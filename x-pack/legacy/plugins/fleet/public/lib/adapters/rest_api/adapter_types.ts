/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FlatObject } from '../../../../common/types/helpers';

export interface RestAPIAdapter {
  get<ResponseData>(
    url: string,
    config?: {
      query?: FlatObject<object>;
    }
  ): Promise<ResponseData>;
  post<ResponseData>(
    url: string,
    config: {
      body: { [key: string]: any };
    }
  ): Promise<ResponseData>;
  delete<T>(url: string): Promise<T>;
  put<ResponseData>(
    url: string,
    config: {
      body: { [key: string]: any };
    }
  ): Promise<ResponseData>;
}
