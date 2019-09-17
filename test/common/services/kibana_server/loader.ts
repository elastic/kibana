/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Axios, { AxiosRequestConfig } from 'axios';

export class Loader {
  private readonly x = Axios.create({
    ...this.options,
    headers: {
      'kbn-xsrf': 'KibanaServerSavedObjects',
    },
  });

  constructor(private readonly options: AxiosRequestConfig) {}

  public async req<T>(desc: string, options: AxiosRequestConfig) {
    try {
      const resp = await this.x.request<T>(options);
      return resp.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Failed to ${desc}:\n${JSON.stringify(error.response.data, null, 2)}`);
      }

      throw error;
    }
  }
}
